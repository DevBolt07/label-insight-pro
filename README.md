
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Backend Setup (OCR Service)

The OCR backend uses **Python 3.11** and **PaddleOCR**.

1. **Prerequisites**: Ensure you have [Python 3.11](https://www.python.org/downloads/release/python-3119/) installed.
2. **Create Virtual Environment**:
   ```bash
   # Windows
   py -3.11 -m venv backend-venv
   ```
3. **Activate Environment**:
   ```bash
   # Windows
   .\backend-venv\Scripts\activate
   ```
4. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```
5. **Run Server**:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/04bbc461-f258-4b72-8758-cc81c9c2d429) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)



Author : 
Hemantkumar Lakhane
Tanmay Kumnhare 

T r i g g e r   F i r e b a s e   d e p l o y  
 