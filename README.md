cd ..  # Back to main folder
cat > README.md << 'EOF'
# 🚀 Auto-ListBuilder

AI-powered Chrome extension that automatically builds targeted prospect lists with contextual outreach messages.

## ✨ Features

- **🔍 One-Click Research**: Screenshot any LinkedIn profile for instant AI analysis
- **🧠 AI-Powered Analysis**: Uses Google Gemini Vision to extract profile data
- **📊 Auto-Storage**: Saves prospects directly to Google Sheets
- **💬 Smart Messaging**: Generates personalized outreach based on recent activity
- **⚡ Real-Time Processing**: Complete analysis in 5-15 seconds

## 🎯 How It Works

1. **Browse LinkedIn** and find interesting prospects
2. **Click the Auto-ListBuilder extension** or floating button
3. **AI analyzes the screenshot** to extract name, company, role, and recent posts
4. **Generates personalized outreach** referencing their specific content
5. **Stores everything in Google Sheets** with quality scores and recommendations

## 🛠️ Tech Stack

- **Frontend**: Chrome Extension (JavaScript, HTML, CSS)
- **Backend**: Python Flask API
- **AI**: Google Gemini Vision 1.5-Flash
- **Storage**: Google Sheets API
- **Deployment**: Local development server

## 📦 Installation

### Prerequisites
- Python 3.8+
- Google Cloud Project with Sheets & Drive APIs enabled
- Google Gemini API key
- Chrome browser

### Backend Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/auto-listbuilder.git
cd auto-listbuilder

2. **Set up Python environment**
cd auto-listbuilder-backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

3. **Configure environment**
cp .env.example .env
# Edit .env with your API keys

4. **Set up Google Sheets**
Set up Google Sheets

- Create service account in Google Cloud Console
- Download JSON credentials
- Share your Google Sheet with the service account email

5. **Start the backend**
python3 app.py

Chrome Extension Setup

Open Chrome Extensions
- Go to chrome://extensions/
- Enable "Developer mode"

Load the extension
- Click "Load unpacked"
- Select the auto-listbuilder-extension folder

Test on LinkedIn
- Visit any LinkedIn profile
- Click the Auto-ListBuilder extension icon
- Click "Add to List"

🔑 Configuration
Required API Keys
- Google Gemini API: Get from Google AI Studio
- Google Service Account: Create in Google Cloud Console

Google Sheets Setup
Your sheet should have these columns:
- Timestamp, Name, Company, Job Title, Platform, URL
Research Summary, Interest Score, Outreach Strategy
Generated Message, etc.

📈 Usage Examples
Basic Prospect Research
- Browse LinkedIn profiles
- Click extension for instant analysis
- Review generated insights in Google Sheets

Bulk List Building
- Use floating button for quick captures
- Process multiple profiles rapidly
- Export data for outreach campaigns

🚧 Roadmap

 Email finder integration (Hunter.io, Apollo)
 Twitter/X support expansion
 Advanced filtering and scoring
 Team collaboration features
 CRM integrations (HubSpot, Salesforce)

🤝 Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit changes (git commit -m 'Add amazing feature')
4. Push to branch (git push origin feature/amazing-feature)
5. Open a Pull Request

⚠️ Security Notes

Never commit API keys or service account files
Use environment variables for all sensitive data
Regularly rotate API keys
Review permissions on Google service accounts

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙋‍♂️ Support
For questions or issues:

Open a GitHub issue
Check the troubleshooting guide
Review API documentation
