# Hostinger MCP Server Guide

## What is MCP (Model Context Protocol)?

**MCP (Model Context Protocol)** is a way for AI assistants (like Cursor's AI) to access external tools and services. Think of it as giving the AI "superpowers" to interact with real-world services.

## What Does the Hostinger MCP Server Do?

The Hostinger MCP server connects Cursor's AI assistant to your **Hostinger hosting account**. This means you can:

### 🚀 **Manage Your Hosting Directly from Cursor**

Instead of logging into Hostinger's dashboard, you can ask Cursor's AI to:

1. **Deploy Your Website**
   - Upload and deploy your built website to Hostinger
   - Deploy WordPress sites, plugins, and themes
   - Deploy JavaScript applications
   - Deploy static websites

2. **Manage Domains**
   - Check domain availability
   - Purchase new domains
   - Manage DNS records
   - Configure domain forwarding
   - Enable/disable domain lock and privacy protection

3. **Manage DNS**
   - View DNS records
   - Update DNS records
   - Create DNS snapshots
   - Restore DNS configurations

4. **Manage VPS (Virtual Private Servers)**
   - List VPS instances
   - Deploy Docker Compose projects
   - Manage firewalls
   - Create and manage SSH keys

5. **Manage Billing & Subscriptions**
   - View subscriptions
   - Enable/disable auto-renewal
   - Manage payment methods

## How to Use It in Cursor

### Step 1: Verify It's Working

1. Open Cursor IDE
2. Start a chat with the AI (Cmd/Ctrl + L)
3. Ask: "What Hostinger tools are available?"
4. The AI should list available Hostinger functions

### Step 2: Common Use Cases

#### **Deploy Your Website to Hostinger**

You can ask the AI:
```
"Deploy my website to Hostinger on domain thesolowardrobe.com"
```

The AI will:
- Build your project (`npm run build`)
- Create an archive of the `dist` folder
- Upload it to Hostinger
- Deploy it to your domain

#### **Check Domain Availability**

```
"Check if 'mynewdomain.com' is available"
```

#### **Update DNS Records**

```
"Add an A record for subdomain.example.com pointing to 192.0.2.1"
```

#### **Deploy a WordPress Plugin**

```
"Deploy the plugin in ./my-plugin folder to my WordPress site"
```

## Practical Examples for Your Project

### Example 1: Deploy After Building

After you run `npm run build`, instead of manually uploading files:

**Ask the AI:**
```
"Deploy the dist folder to Hostinger for thesolowardrobe.com"
```

### Example 2: Set Up DNS for a New Subdomain

**Ask the AI:**
```
"Add a CNAME record for api.thesolowardrobe.com pointing to api.example.com"
```

### Example 3: Deploy a Static Site

**Ask the AI:**
```
"Deploy this as a static website to Hostinger on thesolowardrobe.com"
```

## Available Functions

The Hostinger MCP server provides these main categories:

### 🌐 **Domain Management**
- Check domain availability
- Purchase domains
- Manage domain settings (lock, privacy, forwarding)
- Update nameservers

### 📡 **DNS Management**
- View DNS records
- Update DNS records
- Create/restore DNS snapshots
- Validate DNS configurations

### 🖥️ **Hosting Management**
- List websites
- Create websites
- Deploy websites (WordPress, JS apps, static sites)
- Manage hosting orders

### 💻 **VPS Management**
- List virtual machines
- Deploy Docker Compose projects
- Manage firewalls
- Manage SSH keys
- Run post-install scripts

### 💳 **Billing**
- View subscriptions
- Manage auto-renewal
- View payment methods

## Security Notes

⚠️ **Important:**
- Your API token is stored in the MCP configuration
- The AI can perform actions on your Hostinger account
- Always verify what the AI is about to do before confirming
- Keep your API token secure

## Troubleshooting

### MCP Server Not Appearing?

1. **Restart Cursor** completely (quit and reopen)
2. **Check the configuration** in `~/.cursor/mcp.json` or workspace settings
3. **Verify Node.js** is installed: `node --version`
4. **Check npx** works: `npx --version`

### Functions Not Working?

1. **Verify API token** is correct in the MCP config
2. **Check Hostinger account** has API access enabled
3. **Look for errors** in Cursor's developer console (Help → Toggle Developer Tools)

## Next Steps

1. **Test it**: Ask "What can you do with Hostinger?"
2. **Try a simple task**: "List my Hostinger domains"
3. **Deploy something**: "Deploy my website to Hostinger"

The AI will guide you through the process and ask for any needed information (like domain names, file paths, etc.).

---

**Remember**: The MCP server gives the AI access to your Hostinger account. Always review what it's about to do before confirming actions!

