🐕 Safe or Not
A fast, privacy-first food safety checker for dogs

Quick. Private. Reliable. Know in seconds if a food is safe for your dog.

https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white
https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
https://img.shields.io/badge/Privacy_First-4A90E2?style=for-the-badge&logo=lock&logoColor=white

🚀 Quick Start
bash
# Clone and install
git clone https://github.com/yourusername/safe-or-not.git
cd safe-or-not
npm install

# Configure environment
cp .env.example .env
# Add your API keys to .env

# Start development
npx expo start
✨ Why Safe or Not?
Feature	Benefit
⚡ Instant Results	Most checks complete in milliseconds
🔒 No Tracking	No accounts, no analytics, no data collection
🎯 Deterministic First	Reliable local data before AI fallback
🚨 Emergency Aware	Special handling for toxic hazards
🎯 How It Works
📋 Verdict System
Verdict	Icon	Meaning	Action
SAFE	✅	Known safe for dogs	Feed in moderation
TOXIC	🚨	Known dangerous/poisonous	Contact vet immediately
VET FIRST	⚠️	Uncertain or mixed dish	Consult vet before feeding
🔍 Lookup Pipeline
















🚫 Always-Toxic Hazards (Hard Rules)
These always return TOXIC regardless of dish context:

🍫 Chocolate/Cocoa

🍇 Grapes/Raisins

🍬 Xylitol (sugar-free products)

🥃 Alcohol

🌰 Macadamia Nuts

🧅 Onions/Garlic (in sufficient quantities)

🛠️ Tech Stack
Core Framework

⚛️ React Native + Expo - Cross-platform mobile development

📘 TypeScript - Type-safe codebase

APIs & Services

🏛️ USDA FoodData Central - Authoritative food ingredient data

🧠 OpenRouter (DeepSeek) - LLM fallback for decomposition

💾 AsyncStorage - Local caching & history

Key Libraries

🔍 Fuse.js - Fuzzy searching for autocomplete

⏱️ React Query - API state management

🎨 NativeWind - Utility-first styling

📁 Project Structure
text
safe-or-not/
├── 📁 app/                    # App entry & screens
│   ├── index.tsx             # Root layout
│   ├── input.tsx             # Search + autocomplete
│   └── result.tsx            # Verdict display
├── 📁 src/lib/               # Core logic
│   ├── smartFoodLookup.ts    # Main lookup pipeline
│   ├── decomposeFood.ts      # LLM fallback with guards
│   ├── usdaClient.ts         # USDA API integration
│   ├── usdaCache.ts          # Caching layer
│   └── autocompleteFoods.ts  # Local search
├── 📁 data/                  # Static data
│   └── foods.json           # Canonical food database
├── 📁 assets/               # Images & icons
└── 📄 .env                  # API keys (gitignored)
⚙️ Configuration
Environment Variables
Create a .env file in the root directory:

env
# Required for USDA API access
EXPO_PUBLIC_USDA_API_KEY=your_usda_key_here

# Required for LLM fallback
EXPO_PUBLIC_OPENROUTER_API_KEY=your_openrouter_key_here
API Keys Setup
USDA FoodData Central: Get API Key

OpenRouter: Get API Key (DeepSeek model is free tier)

🎨 Features in Detail
🚀 Instant Autocomplete
Local-only prefix matching

12 max suggestions

Keyboard-navigable dropdown

Shows known verdicts in suggestions

🧠 Intelligent Fallback System
Local Database (foods.json) - 500+ curated foods

USDA API - 25 results prioritized by brand

LLM Decomposition - Strict JSON schema, name guards

Safe Default - Returns VET FIRST on any failure

🔒 Privacy Guarantees
✅ No user accounts required

✅ No analytics or tracking

✅ No data sent to our servers

✅ Local history stored on-device only

✅ API calls made directly from user's device

📱 Screenshots
Search Interface	Safe Result	Toxic Warning
<img src="assets/search.png" width="200">	<img src="assets/safe.png" width="200">	<img src="assets/toxic.png" width="200">
🚀 Development
Available Scripts
bash
# Start development server
npm start

# iOS simulator
npm run ios

# Android emulator
npm run android

# Web version
npm run web

# Type checking
npm run type-check

# Build for production
npm run build
Adding New Foods
Edit data/foods.json:

json
{
  "id": "unique-id",
  "name": "Food Name",
  "synonyms": ["alt name 1", "alt name 2"],
  "verdict": "SAFE|TOXIC|VET_FIRST",
  "ingredients": ["ing1", "ing2"],
  "notes": "Additional context or warnings"
}
📈 Roadmap
🎯 Short Term (Next Release)
Local search history & favorites

Expanded explanation for verdicts

Weight-based risk calculation

Emergency contact quick-dial

🔮 Medium Term
Multi-pet profiles

Photo ingredient scanning

Symptom checker integration

Offline-first enhancements

🌟 Long Term Vision
Cat safety mode

Community-verified foods

Vet telemedicine integration

Pet food recall alerts

🤝 Contributing
We welcome contributions! Please see our Contributing Guidelines for details.

Fork the repository

Create a feature branch (git checkout -b feature/amazing)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing)

Open a Pull Request

⚠️ Important Disclaimer
Safe or Not provides educational guidance only and does NOT replace professional veterinary advice. Always consult a licensed veterinarian for medical decisions regarding your pet's health. When in doubt, contact your vet or pet poison control immediately.

Emergency Contacts
Pet Poison Helpline: (855) 764-7661

ASPCA Animal Poison Control: (888) 426-4435

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
USDA FoodData Central for providing the foundational food database

OpenRouter for accessible LLM API infrastructure

Expo team for an amazing React Native framework

All pet owners who inspired this tool's creation

Made with ❤️ for dogs everywhere

"The better informed we are, the safer our furry friends will be."
