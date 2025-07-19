import os
import base64
import json
import io
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image
import gspread
from google.oauth2.service_account import Credentials

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

class GeminiVisionAnalyzer:
    def __init__(self):
        """Initialize Gemini AI with API key"""
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        print("✅ Gemini Vision AI initialized successfully")
    
    def analyze_screenshot(self, image_data, context):
        """Analyze screenshot using Gemini Vision"""
        try:
            # Convert base64 to PIL Image
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Create comprehensive analysis prompt
            prompt = self.create_analysis_prompt(context)
            
            # Generate analysis
            response = self.model.generate_content([prompt, image])
            
            # Parse the response
            analysis = self.parse_gemini_response(response.text)
            
            return {
                'success': True,
                'analysis': analysis,
                'model_used': 'google_gemini_vision',
                'raw_response': response.text
            }
            
        except Exception as e:
            print(f"❌ Gemini analysis error: {e}")
            return {
                'success': False,
                'error': str(e),
                'model_used': 'google_gemini_vision'
            }
    
    def create_analysis_prompt(self, context):
        """Create detailed prompt for profile analysis"""
        platform = context.get('platform', 'unknown')
        page_type = context.get('page_type', 'unknown')
        
        prompt = f"""
        Analyze this {platform} screenshot for prospect research and lead generation.
        
        Context Information:
        - Platform: {platform}
        - Page Type: {page_type}
        - URL: {context.get('url', 'N/A')}
        - Timestamp: {context.get('timestamp', 'N/A')}
        
        Please extract and analyze the following information:
        
        1. PERSON IDENTIFICATION:
           - Full name
           - Current job title/role
           - Company name
           - Location (if visible)
        
        2. CONTENT ANALYSIS:
           - Recent post content (if visible)
           - Post topic/theme
           - Engagement level indicators
           - Professional interests shown
        
        3. PROSPECT EVALUATION:
           - Decision maker potential (1-10 score)
           - Company size indicators
           - Industry relevance
           - Likelihood to respond to outreach
        
        4. OUTREACH STRATEGY:
           - Best approach angle
           - Personalization opportunities
           - Timing recommendations
           - Key talking points
        
        5. PERSONALIZED MESSAGE:
           - Draft a personalized outreach message (under 150 words)
           - Reference specific content they posted
           - Include clear value proposition
           - Professional but warm tone
        
        Return your analysis as a JSON object with these exact keys:
        {{
            "person_name": "string",
            "job_title": "string", 
            "company": "string",
            "location": "string",
            "post_content": "string",
            "post_topic": "string",
            "decision_maker_score": number,
            "company_size_estimate": "string",
            "industry": "string",
            "response_likelihood": number,
            "outreach_angle": "string",
            "personalization_opportunities": ["string"],
            "best_timing": "string",
            "key_talking_points": ["string"],
            "personalized_message": "string",
            "confidence_score": number,
            "analysis_notes": "string"
        }}
        
        Be thorough but concise. Focus on actionable insights for B2B outreach.
        """
        
        return prompt
    
    def parse_gemini_response(self, response_text):
        """Parse Gemini response to extract structured data"""
        try:
            # Try to find JSON in the response
            import re
            
            # Look for JSON block
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            
            if json_match:
                json_str = json_match.group()
                analysis = json.loads(json_str)
                
                # Validate required fields
                required_fields = [
                    'person_name', 'job_title', 'company', 'decision_maker_score',
                    'response_likelihood', 'outreach_angle', 'personalized_message'
                ]
                
                for field in required_fields:
                    if field not in analysis:
                        analysis[field] = ''
                
                return analysis
            else:
                # Fallback: create structured response from text
                return self.create_fallback_analysis(response_text)
                
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing failed: {e}")
            return self.create_fallback_analysis(response_text)
        except Exception as e:
            print(f"⚠️ Response parsing error: {e}")
            return self.create_fallback_analysis(response_text)
    
    def create_fallback_analysis(self, response_text):
        """Create fallback analysis when JSON parsing fails"""
        return {
            'person_name': 'Could not extract',
            'job_title': 'Could not extract',
            'company': 'Could not extract',
            'location': '',
            'post_content': '',
            'post_topic': '',
            'decision_maker_score': 5,
            'company_size_estimate': 'Unknown',
            'industry': 'Unknown',
            'response_likelihood': 5,
            'outreach_angle': 'General professional outreach',
            'personalization_opportunities': [],
            'best_timing': 'Business hours',
            'key_talking_points': [],
            'personalized_message': 'Hi, I saw your profile and would love to connect about potential opportunities.',
            'confidence_score': 3,
            'analysis_notes': f'Raw AI response: {response_text[:500]}...',
            'parsing_failed': True
        }

class GoogleSheetsManager:
    def __init__(self):
        """Initialize Google Sheets connection"""
        try:
            scope = [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ]
            
            credentials = Credentials.from_service_account_file(
                'ai-listbuilder-service-account.json',
                scopes=scope
            )
            
            self.client = gspread.authorize(credentials)
            
            # Get or create spreadsheet
            spreadsheet_name = os.getenv('GOOGLE_SPREADSHEET_NAME', 'AI Listbuilder')
            
            try:
                self.spreadsheet = self.client.open(spreadsheet_name)
            except gspread.SpreadsheetNotFound:
                # Create new spreadsheet
                self.spreadsheet = self.client.create(spreadsheet_name)
                print(f"📊 Created new spreadsheet: {spreadsheet_name}")
            
            # Get or create main sheet
            try:
                self.sheet = self.spreadsheet.worksheet('Prospects')
            except gspread.WorksheetNotFound:
                self.sheet = self.spreadsheet.add_worksheet('Prospects', rows=1000, cols=20)
                self.setup_headers()
            
            print("✅ Google Sheets connected successfully")
            
        except FileNotFoundError:
            print("❌ Google Sheets service account file not found")
            self.client = None
        except Exception as e:
            print(f"❌ Google Sheets setup failed: {e}")
            self.client = None
    
    def setup_headers(self):
        """Set up column headers in the sheet"""
        headers = [
            'Timestamp', 'Name', 'Company', 'Job Title', 'Location',
            'Platform', 'URL', 'Post Content', 'Industry',
            'Decision Maker Score', 'Response Likelihood', 'Outreach Angle',
            'Personalized Message', 'Best Timing', 'Key Talking Points',
            'Confidence Score', 'Analysis Model', 'Status', 'Notes'
        ]
        
        self.sheet.append_row(headers)
        print("📋 Sheet headers configured")
    
    def add_prospect(self, analysis_result, context):
        """Add analyzed prospect to Google Sheets"""
        if not self.client:
            return {'success': False, 'error': 'Google Sheets not configured'}
        
        try:
            analysis = analysis_result.get('analysis', {})
            
            # Prepare row data
            row_data = [
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                analysis.get('person_name', ''),
                analysis.get('company', ''),
                analysis.get('job_title', ''),
                analysis.get('location', ''),
                context.get('platform', ''),
                context.get('url', ''),
                analysis.get('post_content', ''),
                analysis.get('industry', ''),
                analysis.get('decision_maker_score', 5),
                analysis.get('response_likelihood', 5),
                analysis.get('outreach_angle', ''),
                analysis.get('personalized_message', ''),
                analysis.get('best_timing', ''),
                ', '.join(analysis.get('key_talking_points', [])),
                analysis.get('confidence_score', 5),
                analysis_result.get('model_used', ''),
                'New',
                analysis.get('analysis_notes', '')
            ]
            
            # Add to sheet
            self.sheet.append_row(row_data)
            row_number = len(self.sheet.get_all_records()) + 1
            
            print(f"📊 Added prospect to row {row_number}")
            
            return {
                'success': True,
                'row_number': row_number,
                'prospect_name': analysis.get('person_name', 'Unknown')
            }
            
        except Exception as e:
            print(f"❌ Failed to add prospect to sheets: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Initialize components
try:
    vision_analyzer = GeminiVisionAnalyzer()
    sheets_manager = GoogleSheetsManager()
    print("🚀 AI Listbuilder backend initialized successfully")
except Exception as e:
    print(f"❌ Backend initialization failed: {e}")
    vision_analyzer = None
    sheets_manager = None

@app.route('/api/analyze-screenshot', methods=['POST'])
def analyze_screenshot():
    """Main endpoint for screenshot analysis"""
    if not vision_analyzer:
        return jsonify({
            'success': False,
            'error': 'Vision analyzer not initialized'
        }), 500
    
    try:
        data = request.get_json()
        screenshot = data.get('screenshot')
        context = data.get('context', {})
        
        if not screenshot:
            return jsonify({
                'success': False,
                'error': 'Screenshot data required'
            }), 400
        
        print(f"🔍 Analyzing screenshot for {context.get('url', 'unknown URL')}")
        
        # Analyze with Gemini Vision
        analysis_result = vision_analyzer.analyze_screenshot(screenshot, context)
        
        if analysis_result['success']:
            print(f"✅ Analysis successful for {analysis_result['analysis'].get('person_name', 'unknown person')}")
            
            # Store in Google Sheets
            storage_result = sheets_manager.add_prospect(analysis_result, context)
            
            return jsonify({
                'success': True,
                'analysis': analysis_result,
                'storage': storage_result,
                'timestamp': datetime.now().isoformat()
            })
        else:
            print(f"❌ Analysis failed: {analysis_result.get('error')}")
            return jsonify(analysis_result), 500
            
    except Exception as e:
        print(f"❌ API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'vision_model': 'google_gemini_vision',
        'sheets_connected': sheets_manager.client is not None if sheets_manager else False,
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get processing statistics"""
    if not sheets_manager or not sheets_manager.client:
        return jsonify({
            'success': False,
            'error': 'Google Sheets not available'
        }), 500
    
    try:
        records = sheets_manager.sheet.get_all_records()
        
        # Calculate stats
        total_prospects = len(records)
        today = datetime.now().strftime("%Y-%m-%d")
        today_prospects = len([r for r in records if r.get('Timestamp', '').startswith(today)])
        
        avg_decision_score = sum([r.get('Decision Maker Score', 0) for r in records]) / max(total_prospects, 1)
        avg_response_likelihood = sum([r.get('Response Likelihood', 0) for r in records]) / max(total_prospects, 1)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_prospects': total_prospects,
                'today_prospects': today_prospects,
                'avg_decision_score': round(avg_decision_score, 1),
                'avg_response_likelihood': round(avg_response_likelihood, 1),
                'last_updated': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting AI Listbuilder backend server...")
    print(f"Vision Model: Google Gemini Vision")
    print(f"Google Sheets: {'Connected' if sheets_manager and sheets_manager.client else 'Not configured'}")
    print("Server running at http://localhost:8000")
    app.run(host="127.0.0.1", port=8000, debug=True)
