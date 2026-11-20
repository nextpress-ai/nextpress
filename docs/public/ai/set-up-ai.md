---
title: Set up AI
description: Connect an AI service to a site, choose the model, save the key, test the connection, and change or remove the settings.
order: 1
type: Guide
---

# Set up AI

The page assistant works through an AI service you connect. You choose the service and the model, and add your key. The service bills you for what the assistant uses. AI settings belong to one site.

## Before you start

- You need the admin or owner role on the site. Others see the settings but cannot change them.
- From your AI service, get a key and the exact name of a model.
- The model must be able to use tools. A model that can only chat cannot build pages.
- For a service other than the three built in, get its address, such as `https://example.com/v1`.

## Connect a service

1. Open **Settings** in the sidebar, then the **AI** tab.
2. Under **AI service**, pick one:
   - **Anthropic (Claude)**
   - **OpenAI**
   - **Google (Gemini)**
   - **Any OpenAI-compatible service**, such as OpenRouter, Ollama or LM Studio. This one needs an address.
3. For **Any OpenAI-compatible service**, fill in **Address**. Pick a starting point, or paste the address your service gave you:
   - **OpenRouter**: `https://openrouter.ai/api/v1`
   - **Ollama on this server**: `http://localhost:11434/v1`
   - **LM Studio on this server**: `http://localhost:1234/v1`
4. In **Model name**, type the model's name as your service lists it. For Anthropic, the form suggests names.
5. Under **Key**, press **Add a key** and paste the key. A local service that needs no key can be left empty.
6. Press **Save**.
7. Press **Test connection**. It makes one small request. On success it says "The connection works. This model can use tools."

The assistant is now on for this site. Open a page in the page builder and choose the **Assistant** tab.

## Rules for addresses

- An address on the internet must start with `https://`.
- If you paste an address that ends in `/chat/completions`, that ending is removed when it is saved.
- An address on this server or your private network can be saved only by an owner or admin of the main site. It keeps working only while that person is still an owner or admin of the main site.
- An address with a user name and password in it is refused. Put the key in **Key**.

## Change or remove the settings

- To change the service, model or address, edit the fields and press **Save**. A new service or address needs its key again.
- To change only the key, press **Replace**, paste the new key, and press **Save**.
- To turn the assistant off, press **Remove**, then **Remove** in **Remove the AI settings?**. Your pages are not changed.

After saving, only the last characters of the key are shown.

## When the test fails

| Message | What to do |
|---|---|
| The saved key was refused. A site admin can replace it in Settings → AI. | Press **Replace** and paste the full key |
| The service at that address doesn't recognise that model. Check the address and the model name. | Copy the model name from your service, and check the address |
| This model can chat but can't use tools, so it can't build pages. | Choose a model that supports tools |
| The AI service is busy or out of credit. Try again in a minute. | Wait, or add credit at your service |
| The AI service didn't answer. Try again in a moment. | Check the address, and that a local service is running |
| Too many saves. Wait a few minutes, then try again. | Wait before saving again |

## Next steps

- [Use the page assistant](/docs/ai/page-assistant).
- [Roles](/docs/people/roles) to see who can use it.
- [Limits](/docs/self-hosting/limits) for the assistant's limits.
