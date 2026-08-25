const OpenAI = require('openai');
const { pool } = require('../db/db');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_DISCOUNT_PERCENT = 20;
const MAX_UPSELL_ATTEMPTS = 2;
const MAX_TRANSACTION_VALUE = 500000;

async function logAudit(sessionId, action, input, reasoning, outcome) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (session_id, action, input_data, reasoning, outcome) VALUES ($1, $2, $3, $4, $5)',
      [sessionId, action, JSON.stringify(input), reasoning, outcome]
    );
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

async function requestApproval(sessionId, action, details) {
  try {
    const result = await pool.query(
      'INSERT INTO approvals (session_id, action, details, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [sessionId, action, JSON.stringify(details), 'pending']
    );
    return { status: 'pending_approval', approval_id: result.rows[0].id, message: 'This action requires merchant approval.' };
  } catch (error) {
    console.error('Failed to request approval:', error);
    return { status: 'error', message: 'Failed to request approval' };
  }
}

const tools = [
  {
    type: "function",
    function: {
      name: "search_catalog",
      description: "Find products in the catalog based on search terms",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query for product name or description" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_upsell",
      description: "Suggest a bundle or upgrade to the user",
      parameters: {
        type: "object",
        properties: {
          cart_items: { type: "array", items: { type: "string" }, description: "Items currently in the cart" },
          suggested_product: { type: "string", description: "Name of the product to upsell" }
        },
        required: ["cart_items", "suggested_product"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "apply_discount",
      description: "Apply a percentage discount to the order",
      parameters: {
        type: "object",
        properties: {
          discount_percent: { type: "number", description: "Percentage discount to apply (0-100)" },
          reasoning: { type: "string", description: "Reason for applying the discount" }
        },
        required: ["discount_percent", "reasoning"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Initiate the checkout process by creating an order",
      parameters: {
        type: "object",
        properties: {
          total_amount: { type: "number", description: "Total amount of the order in base currency" }
        },
        required: ["total_amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Adds a product to the user's shopping cart.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string" },
          price: { type: "number" },
          qty: { type: "integer", default: 1 }
        },
        required: ["product_name", "price"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_from_cart",
      description: "Removes a product from the user's shopping cart.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string" }
        },
        required: ["product_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_cart_quantity",
      description: "Updates the quantity of a product in the user's shopping cart.",
      parameters: {
        type: "object",
        properties: {
          product_name: { type: "string" },
          qty: { type: "integer" }
        },
        required: ["product_name", "qty"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_address",
      description: "Saves the user's shipping address to their profile.",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string" }
        },
        required: ["address"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "clear_cart",
      description: "Removes all items from the user's shopping cart.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

async function handleToolCall(toolCall, sessionId, sessionState) {
  const name = toolCall.function.name;
  let args = {};
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch (error) {
    console.warn(`Failed to parse tool arguments directly: ${toolCall.function.arguments}. Attempting regex extraction.`);
    const match = toolCall.function.arguments.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        args = JSON.parse(match[0]);
      } catch (e) {
        console.error('Regex extraction failed to produce valid JSON.');
      }
    }
  }

  await logAudit(sessionId, `tool_call: ${name}`, args, 'Agent invoked tool', 'PENDING');

  if (name === 'search_catalog') {
    const res = await pool.query('SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1', [`%${args.query}%`]);
    await logAudit(sessionId, `tool_result: ${name}`, args, 'Fetched products', 'SUCCESS');
    return res.rows;
  }

  if (name === 'suggest_upsell') {
    if (sessionState.upsellAttempts >= MAX_UPSELL_ATTEMPTS) {
      await logAudit(sessionId, `tool_result: ${name}`, args, 'Max upsell attempts reached', 'REJECTED');
      return { error: 'Max upsell attempts reached' };
    }
    sessionState.upsellAttempts += 1;
    await logAudit(sessionId, `tool_result: ${name}`, args, 'Suggested upsell', 'SUCCESS');
    return { success: true, message: `Upsell suggested: ${args.suggested_product}` };
  }

  if (name === 'apply_discount') {
    if (args.discount_percent > MAX_DISCOUNT_PERCENT) {
      const approval = await requestApproval(sessionId, 'apply_discount', args);
      await logAudit(sessionId, `tool_result: ${name}`, args, `Discount ${args.discount_percent}% > ${MAX_DISCOUNT_PERCENT}% limit`, 'PENDING_APPROVAL');
      return approval;
    }
    await logAudit(sessionId, `tool_result: ${name}`, args, `Discount ${args.discount_percent}% applied`, 'SUCCESS');
    return { success: true, discount_applied: args.discount_percent };
  }

  if (name === 'create_order') {
    if (args.total_amount > MAX_TRANSACTION_VALUE) {
      const approval = await requestApproval(sessionId, 'create_order', args);
      await logAudit(sessionId, `tool_result: ${name}`, args, `Amount ${args.total_amount} > ${MAX_TRANSACTION_VALUE} limit`, 'PENDING_APPROVAL');
      return approval;
    }
    
    try {
      // Create actual Razorpay order
      const options = {
        amount: Math.round(args.total_amount * 100), // convert to paise/cents
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
      };
      const order = await razorpay.orders.create(options);
      
      // Save order to database
      await pool.query(
        'INSERT INTO orders (user_id, razorpay_order_id, total_amount, status) VALUES ($1, $2, $3, $4)',
        [1, order.id, args.total_amount, 'pending']
      );

      await logAudit(sessionId, `tool_result: ${name}`, args, 'Order creation permitted and Razorpay order generated', 'SUCCESS');
      return { 
        success: true, 
        message: 'Order created, proceed to payment.', 
        total: args.total_amount,
        order_id: order.id,
        currency: order.currency
      };
    } catch (err) {
      console.error('Error generating Razorpay order in agentService:', err);
      await logAudit(sessionId, `tool_result: ${name}`, args, 'Order creation failed at Razorpay', 'FAILED');
      return { error: 'Failed to create payment order.' };
    }
  }

  if (name === 'add_to_cart') {
    await logAudit(sessionId, `tool_result: ${name}`, args, `Added ${args.qty || 1}x ${args.product_name} to cart`, 'SUCCESS');
    return { 
      success: true, 
      message: `${args.qty || 1}x ${args.product_name} has been added to your cart.`,
      cart_update: {
        product_name: args.product_name,
        price: args.price,
        qty: args.qty || 1
      }
    };
  }

  if (name === 'remove_from_cart') {
    await logAudit(sessionId, `tool_result: ${name}`, args, `Removed ${args.product_name} from cart`, 'SUCCESS');
    return { 
      success: true, 
      message: `${args.product_name} has been removed from your cart.`,
      cart_remove: {
        product_name: args.product_name
      }
    };
  }

  if (name === 'update_cart_quantity') {
    await logAudit(sessionId, `tool_result: ${name}`, args, `Updated ${args.product_name} qty to ${args.qty}`, 'SUCCESS');
    return { 
      success: true, 
      message: `${args.product_name} quantity updated to ${args.qty}.`,
      cart_update_qty: {
        product_name: args.product_name,
        qty: args.qty
      }
    };
  }

  if (name === 'clear_cart') {
    await logAudit(sessionId, `tool_result: ${name}`, args, `Cleared the shopping cart`, 'SUCCESS');
    return { 
      success: true, 
      message: `Your shopping cart has been cleared.`,
      cart_clear: true
    };
  }

  if (name === 'update_address') {
    try {
      await pool.query('UPDATE users SET address = $1 WHERE id = 1', [args.address]);
      await logAudit(sessionId, `tool_result: ${name}`, args, 'Updated user address', 'SUCCESS');
      return { success: true, message: 'Address updated successfully.' };
    } catch (err) {
      console.error('Error updating address:', err);
      return { error: 'Failed to update address.' };
    }
  }

  return { error: 'Unknown tool' };
}

async function processChat(messages, sessionId, sessionState) {
  try {
    // Build dynamic system prompt with user profile
    const profileInfo = sessionState.profile 
      ? `\nUser Profile:\nName: ${sessionState.profile.name}\nEmail: ${sessionState.profile.email}\nAddress: ${sessionState.profile.address || 'None saved'}`
      : '';

    const cartContext = sessionState.cart && sessionState.cart.length > 0
      ? `\nCURRENT SHOPPING CART:\n${sessionState.cart.map(i => `- ${i.qty}x ${i.product_name} (₹${i.price} each)`).join('\n')}`
      : `\nCURRENT SHOPPING CART: Empty`;

    const SYSTEM_PROMPT = `You are a helpful AI sales concierge for the Nexus Store. 
    You can search for products, recommend upsells, apply limited discounts, manage the user's shopping cart, and process checkout orders.
    Be conversational, polite, and concise.

    IMPORTANT RULES:
    1. If a user asks for a discount, use apply_discount. Max allowed is 20%. If they ask for more, STILL use the tool (it will route to admin approval).
    2. If the user wants to buy a product, ask if they want to add it to their cart or check out immediately.
    3. If they want to add a NEW product to the cart, use add_to_cart. If they want to remove or update the quantity of a product ALREADY in the cart, use remove_from_cart or update_cart_quantity. Check the CURRENT SHOPPING CART context to see what they have before deciding which tool to use.
    4. If they want to check out, you MUST verify they have an address saved. If the Address is "None saved", ask them for their address first. 
    5. Once they provide an address, use update_address to save it. 
    6. DO NOT execute create_order unless an address is saved in the profile.
    7. All prices are in Rupees (₹). Ensure you display prices as ₹, not $.
    ${profileInfo}
    ${cartContext}
    `;

    // Ensure system prompt is the first message
    const msgsWithSystem = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.filter(m => m.role !== 'system')
    ];

    const response = await openai.chat.completions.create({
      model: "nvidia/nemotron-3.5-lightning:free", // Reliable OpenRouter model for tools
      max_tokens: 1024,
      messages: msgsWithSystem,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;
    if (!responseMessage.content) {
      responseMessage.content = "";
    }

    // Fallback: If the model leaked the tool call into the text content via XML tags
    if (!responseMessage.tool_calls && responseMessage.content) {
      const xmlMatch = responseMessage.content.match(/<function>\s*<name>([^<]+)<\/name>\s*<parameter>([\s\S]*?)<\/parameter>\s*<\/function>/);
      if (xmlMatch) {
        responseMessage.tool_calls = [{
          id: 'call_' + Date.now(),
          type: 'function',
          function: {
            name: xmlMatch[1].trim(),
            arguments: xmlMatch[2].trim()
          }
        }];
      }
    }

    if (responseMessage.tool_calls) {
      const toolResults = [];
      for (const toolCall of responseMessage.tool_calls) {
        const result = await handleToolCall(toolCall, sessionId, sessionState);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }
      return { message: responseMessage, toolResults: toolResults };
    }

    return { message: responseMessage };
  } catch (error) {
    console.error('OpenAI Error:', error);
    throw error;
  }
}

module.exports = {
  processChat
};
