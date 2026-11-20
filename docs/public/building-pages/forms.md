---
title: Forms
description: Add a form to a page, set up its fields and send button, and read, export or delete the answers in the Forms screen.
order: 3
type: Guide
---

# Forms

A form collects answers from visitors, such as a contact request or a sign-up. Answers are stored in NextPress and shown in the **Forms** screen. NextPress sends no email when a form is answered, so check the **Forms** screen for new answers.

## Add a form to a page

1. Open the page in the page builder.
2. In the **Blocks** panel, open **Form fields** and drag **Form** onto the canvas.
   A new form already holds **Your name**, **Your email** (required), **Message**, and a **Send** button.
3. To add more questions, drag **Text field**, **Text area** or **Dropdown** into the form.
4. Select the **Form** block. In **Form name**, type a name such as "Contact". Each answer in **Forms** is labelled with it.
5. In **Message after sending**, type what visitors see once the form is sent, such as "Thanks. We reply within two working days."
6. Press **Save**, then **Publish**. A form only accepts answers on a published page.

## Set up each field

Select a field to see its settings:

- **Label**: the question visitors see.
- **Placeholder**: faint example text inside the box.
- **Help**: a short line under the field.
- **Required**: the form will not send until this field is filled in.
- **Input type** (text field only): **Text**, **Search**, **Email**, **Password**, **Number**, **Phone** or **URL**. **Email** checks for a valid address.
- **Options** (dropdown only): the choices.
- **Rows** (text area only): its height.

Under **More**:

- **Answer name**: the name the answer is stored under. Use a short, clear name such as `email`.
- **Default value**: text filled in before the visitor types.
- **Accessible label**: words read by screen readers when the visible label is not enough.
- **Disabled**: shows the field but stops changes.

## Set up the send button

The form is sent by a **Button** inside it with **Sends the form** turned on. The button in a new form already has it on. If you add your own button, select it and turn on **Sends the form**.

## What visitors see

- When a required field is empty: "Please fill in" followed by the field's label.
- When an email is not valid: "Please enter a valid email for" followed by the label.
- When an answer is longer than 5,000 characters: the label followed by "is too long. Please shorten it."
- When one address sends more than 5 forms in a minute: "Too many messages at once. Please wait a minute and try again."
- When it works: your **Message after sending**.

## Read the answers

1. Open **Forms** in the sidebar, under **Content**.
2. Use the **Form** list to choose one form, or **All forms**.
3. Use the **Status** list to show **All**, **New** or **Read** answers.
4. Click a row to open the answer. Opening it marks it as read. Press **Mark as new** to mark it unread again.

## Export or delete answers

- Press **Export CSV** to download the answers of the chosen form, or of all forms, as a spreadsheet file. It is greyed out when there are no answers.
- To delete one answer, open it, press **Delete**, then confirm. It is removed for good and no longer appears in exports.

Answers can hold personal details. Keep exported files somewhere safe.

## Forms inside templates

A form can sit inside a template, such as a footer sign-up. It accepts answers on every published page that shows the template, and the answers arrive in **Forms** like any other.

## Next steps

- [Templates and themes](/docs/building-pages/templates-and-themes) to reuse a form on many pages.
- [Publishing and previews](/docs/building-pages/publishing-and-previews).
- [Roles](/docs/people/roles) to see who can read the answers.
