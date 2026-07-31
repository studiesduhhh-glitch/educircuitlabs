const state = window.EducircuitState || {
  schools: {},
  user: {
    uid: "",
    name: "",
    role: "student",
    className: "",
    school: "",
    schoolKey: "",
    schoolUsername: ""
  },
  projectName: "Untitled STEM Project",
  items: [],
  wires: [],
  logic: [],
  zoom: 1,
  selectedPort: null,
  wireDrag: null,
  drag: null,
  currentProjectIndex: null,
  projectOwnerName: "",
  logicArmed: false,
  nextId: 1,
  gridVisible: true,
  defaultBatteryVoltage: 5,
  outputs: {
    led: false,
    motor: false,
    buzzer: false,
    overload: false
  },
  coach: {
    status: "Ready",
    hint: "Build a loop from battery + through your components and return to battery -.",
    fix: "Correct connection: Battery + -> first component +, each component - -> next component +, then final component - -> Battery -."
  },
  learning: {
    selectedChallengeId: "led-circuit",
    lastResult: null
  },
  activeItems: [],
  aiTeacherMessages: [],
  burstItems: [],
  assignments: [],
  activeAssignment: null,
  demoMode: false,
  buildReplay: {
    history: [],
    lastSignature: "",
    isPlaying: false
  },
  multimeter: {
    selection: { type: "overview" }
  },
  aiViva: {
    active: false,
    questions: [],
    answers: [],
    currentIndex: 0,
    summary: null
  },
  voiceConversation: {
    listening: false,
    supported: false,
    transcript: ""
  }
};
window.EducircuitState = state;
state.lang = state.lang || "en";
window.EducircuitRuntimePrefs = window.EducircuitRuntimePrefs || {
  theme: "light",
  hideLanding: false,
  voiceCoachEnabled: true,
  voiceCoachVoice: ""
};
const UI = window.EducircuitUI;
const performanceTools = window.EducircuitPerformance || {};

// 🔥 FIREBASE SETUP
const firebaseConfig = {
  apiKey: "AIzaSyD1sGDTh1PECJrPXGkmqmP-_1nUyBmxNvU",
  authDomain: "educircuitlabs.firebaseapp.com",
  projectId: "educircuitlabs",
  storageBucket: "educircuitlabs.firebasestorage.app",
  messagingSenderId: "1031956078247",
  appId: "1:1031956078247:web:3a2c0033f51773b0c98582"
};

function createOfflineFirebaseFallback(){
  const unavailable = () => {
    const error = new Error("Firebase is not available right now. Check your internet connection and try again.");
    error.code = "unavailable";
    return error;
  };

  const emptySnapshot = {
    empty: true,
    docs: [],
    forEach(){}
  };

  function createDocSnapshot(id = ""){
    return {
      id,
      exists: false,
      data: () => null
    };
  }

  function createQueryRef(){
    return {
      where(){ return this; },
      orderBy(){ return this; },
      limit(){ return this; },
      async get(){ return emptySnapshot; }
    };
  }

  function createDocRef(path = ""){
    const id = path.split("/").filter(Boolean).pop() || "";
    return {
      id,
      path,
      collection(name){ return createCollectionRef(`${path}/${name}`); },
      async get(){ return createDocSnapshot(id); },
      async set(){ throw unavailable(); },
      async update(){ throw unavailable(); }
    };
  }

  function createCollectionRef(path = ""){
    const query = createQueryRef();
    return {
      path,
      doc(id = `offline-${Date.now()}`){ return createDocRef(`${path}/${id}`); },
      where: query.where.bind(query),
      orderBy: query.orderBy.bind(query),
      limit: query.limit.bind(query),
      async get(){ return emptySnapshot; },
      async add(){ throw unavailable(); }
    };
  }

  const listeners = new Set();
  const authFallback = {
    currentUser: null,
    setPersistence(){ return Promise.resolve(); },
    onAuthStateChanged(callback){
      listeners.add(callback);
      const timer = setTimeout(() => callback(this.currentUser), 0);
      return () => {
        clearTimeout(timer);
        listeners.delete(callback);
      };
    },
    async createUserWithEmailAndPassword(){ throw unavailable(); },
    async signInWithEmailAndPassword(){ throw unavailable(); },
    async signInWithPopup(){ throw unavailable(); },
    async signOut(){
      this.currentUser = null;
      listeners.forEach(callback => callback(null));
    }
  };

  const dbFallback = {
    collection(name){ return createCollectionRef(name); },
    collectionGroup(){ return createQueryRef(); },
    batch(){
      return {
        set(){},
        update(){},
        async commit(){ throw unavailable(); }
      };
    },
    async runTransaction(){ throw unavailable(); }
  };

  const fallback = {
    __offline: true,
    initializeApp(){ return null; },
    auth(){ return authFallback; },
    firestore(){ return dbFallback; }
  };

  fallback.auth.Auth = {
    Persistence: {
      LOCAL: "local",
      SESSION: "session",
      NONE: "none"
    }
  };
  fallback.auth.GoogleAuthProvider = null;
  fallback.firestore.FieldValue = {
    arrayUnion: (...values) => values,
    arrayRemove: () => [],
    increment: value => value,
    serverTimestamp: () => new Date()
  };

  return fallback;
}

const firebaseApi = window.firebase?.initializeApp && window.firebase?.auth && window.firebase?.firestore
  ? window.firebase
  : createOfflineFirebaseFallback();

if(!window.firebase){
  window.firebase = firebaseApi;
}

if(firebaseApi.__offline){
  console.warn("Firebase SDK is not available; Educircuit is running in offline demo mode.");
} else {
  try {
    firebaseApi.initializeApp(firebaseConfig);
  } catch(error) {
    if(!/already exists/i.test(error?.message || "")){
      console.warn("Firebase initialization warning", error);
    }
  }
}

const auth = firebaseApi.auth();
const db = firebaseApi.firestore();


const LANGUAGE_OPTIONS = [
  { code: "en", label: "English", toast: "Language switched 🌐" },
  { code: "hi", label: "हिन्दी", toast: "हिन्दी चुनी गई 🌐" },
  { code: "ta", label: "தமிழ்", toast: "தமிழ் தேர்ந்தெடுக்கப்பட்டது 🌐" },
  { code: "te", label: "తెలుగు", toast: "తెలుగు ఎంచుకున్నారు 🌐" },
  { code: "kn", label: "ಕನ್ನಡ", toast: "ಕನ್ನಡ ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ 🌐" },
  { code: "ml", label: "മലയാളം", toast: "മലയാളം തിരഞ്ഞെടുത്തു 🌐" },
  { code: "bn", label: "বাংলা", toast: "বাংলা বেছে নেওয়া হয়েছে 🌐" },
  { code: "mr", label: "मराठी", toast: "मराठी निवडले 🌐" },
  { code: "gu", label: "ગુજરાતી", toast: "ગુજરાતી પસંદ કર્યું 🌐" },
  { code: "pa", label: "ਪੰਜਾਬੀ", toast: "ਪੰਜਾਬੀ ਚੁਣੀ ਗਈ 🌐" },
  { code: "ur", label: "اردو", toast: "اردو منتخب ہو گئی 🌐" },
  { code: "or", label: "ଓଡ଼ିଆ", toast: "ଓଡ଼ିଆ ବାଛାଗଲା 🌐" },
  { code: "as", label: "অসমীয়া", toast: "অসমীয়া বাছনি কৰা হল 🌐" },
  { code: "sa", label: "संस्कृत", toast: "संस्कृतं चयनितम् 🌐" },
  { code: "kok", label: "कोंकणी", toast: "कोंकणी निवडली 🌐" },
  { code: "ne", label: "नेपाली", toast: "नेपाली छानियो 🌐" },
  { code: "sd", label: "سنڌي", toast: "سنڌي چونڊي وئي 🌐" },
  { code: "ks", label: "کٲشُر", toast: "کٲشُر منتخب 🌐" },
  { code: "doi", label: "डोगरी", toast: "डोगरी चुनी गई 🌐" },
  { code: "mai", label: "मैथिली", toast: "मैथिली चुनल गेल 🌐" },
  { code: "brx", label: "बड़ो", toast: "बड़ो चुना गया 🌐" },
  { code: "mni", label: "ꯃꯤꯇꯩꯂꯣꯟ", toast: "ꯃꯤꯇꯩꯂꯣꯟ selected 🌐" },
  { code: "sat", label: "ᱥᱟᱱᱛᱟᱲᱤ", toast: "ᱥᱟᱱᱛᱟᱲᱤ selected 🌐" }
];
const LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map(language => language.code));

const translations = {
  ta: {
    "EDUCIRCUIT": "எடுசர்க்யூட்",
    "Components": "கூறுகள்",
    "Logic Blocks": "தருக்க கட்டுகள்",
    "Example Projects": "உதாரண திட்டங்கள்",
    "Student Dashboard": "மாணவர் டாஷ்போர்டு",
    "Teacher Panel": "ஆசிரியர் பகுதி",
    "Submit Project": "திட்டத்தை சமர்ப்பிக்கவும்",
    "Rename": "மறுபெயரிடு",
    "Run Logic": "தருக்கத்தை இயக்கு",
    "Reset Outputs": "அவுட்புட்களை ரீசெட் செய்",
    "Auto Wire": "தானியங்கி இணைப்பு",
    "Toggle Grid": "கிரிட் மாற்று",
    "Save": "சேமிக்க",
    "Clear": "அழி",
    "Student": "மாணவர்",
    "Teacher": "ஆசிரியர்",
    "Enter Platform": "பிளாட்பார்மை திற",
    "Full name": "முழு பெயர்",
    "School": "பள்ளி",
    "Class / Section": "வகுப்பு",
    "Role": "பங்கு",
    "DIY Components": "DIY கூறுகள்",
    "Simulation Outputs": "விளைவுகள்",
    "Dashboard": "டாஷ்போர்டு",
    "Goal Leaderboard": "முன்னணி பட்டியல்",
    "Battery": "பேட்டரி",
    "Motor": "மோட்டார்",
    "Switch": "சுவிட்ச்",
    "LED": "எல்இடி",
    "Buzzer": "பஸர்",
    "Language": "மொழி",
    "AI Teacher": "AI ஆசிரியர்",
    "Logout": "வெளியேறு",
    "Not logged in": "உள்நுழையவில்லை",
    "Zoom −": "சிறிதாக்கு −",
    "Zoom +": "பெரிதாக்கு +",
    "Voice": "குரல்"
  },
  hi: {
    "Components": "घटक",
    "Logic Blocks": "लॉजिक ब्लॉक",
    "Example Projects": "उदाहरण प्रोजेक्ट",
    "Student Dashboard": "छात्र डैशबोर्ड",
    "Teacher Panel": "शिक्षक पैनल",
    "Submit Project": "प्रोजेक्ट जमा करें",
    "Rename": "नाम बदलें",
    "Run Logic": "लॉजिक चलाएं",
    "Reset Outputs": "आउटपुट रीसेट करें",
    "Auto Wire": "ऑटो वायर",
    "Toggle Grid": "ग्रिड बदलें",
    "Save": "सेव",
    "Clear": "साफ करें",
    "Student": "छात्र",
    "Teacher": "शिक्षक",
    "School": "स्कूल",
    "Class / Section": "कक्षा / सेक्शन",
    "DIY Components": "DIY घटक",
    "Simulation Outputs": "सिमुलेशन आउटपुट",
    "Dashboard": "डैशबोर्ड",
    "Battery": "बैटरी",
    "Motor": "मोटर",
    "Switch": "स्विच",
    "LED": "एलईडी",
    "Buzzer": "बजर",
    "Language": "भाषा",
    "AI Teacher": "AI शिक्षक",
    "Logout": "लॉग आउट",
    "Not logged in": "लॉग इन नहीं"
  },
  te: {
    "Components": "భాగాలు",
    "Student Dashboard": "విద్యార్థి డ్యాష్‌బోర్డ్",
    "Teacher Panel": "ఉపాధ్యాయ ప్యానెల్",
    "Submit Project": "ప్రాజెక్ట్ సమర్పించండి",
    "Rename": "పేరు మార్చండి",
    "Run Logic": "లాజిక్ నడపండి",
    "Reset Outputs": "అవుట్‌పుట్‌లను రీసెట్ చేయండి",
    "Auto Wire": "ఆటో వైర్",
    "Toggle Grid": "గ్రిడ్ మార్చండి",
    "Save": "సేవ్",
    "Clear": "క్లియర్",
    "Student": "విద్యార్థి",
    "Teacher": "ఉపాధ్యాయుడు",
    "DIY Components": "DIY భాగాలు",
    "Dashboard": "డ్యాష్‌బోర్డ్",
    "Battery": "బ్యాటరీ",
    "Motor": "మోటార్",
    "Switch": "స్విచ్",
    "LED": "ఎల్ఈడి",
    "Buzzer": "బజర్",
    "Language": "భాష",
    "AI Teacher": "AI ఉపాధ్యాయుడు",
    "Logout": "లాగ్ అవుట్"
  },
  kn: {
    "Components": "ಘಟಕಗಳು",
    "Student Dashboard": "ವಿದ್ಯಾರ್ಥಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "Teacher Panel": "ಶಿಕ್ಷಕರ ಪ್ಯಾನೆಲ್",
    "Submit Project": "ಪ್ರಾಜೆಕ್ಟ್ ಸಲ್ಲಿಸಿ",
    "Rename": "ಹೆಸರು ಬದಲಿಸಿ",
    "Run Logic": "ಲಾಜಿಕ್ ಚಲಾಯಿಸಿ",
    "Reset Outputs": "ಔಟ್‌ಪುಟ್‌ಗಳನ್ನು ಮರುಹೊಂದಿಸಿ",
    "Auto Wire": "ಆಟೋ ವೈರ್",
    "Toggle Grid": "ಗ್ರಿಡ್ ಬದಲಿಸಿ",
    "Save": "ಸೇವ್",
    "Clear": "ತೆರವುಗೊಳಿಸಿ",
    "Student": "ವಿದ್ಯಾರ್ಥಿ",
    "Teacher": "ಶಿಕ್ಷಕ",
    "DIY Components": "DIY ಘಟಕಗಳು",
    "Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "Battery": "ಬ್ಯಾಟರಿ",
    "Motor": "ಮೋಟರ್",
    "Switch": "ಸ್ವಿಚ್",
    "LED": "ಎಲ್ಇಡಿ",
    "Buzzer": "ಬಜರ್",
    "Language": "ಭಾಷೆ",
    "AI Teacher": "AI ಶಿಕ್ಷಕ",
    "Logout": "ಲಾಗ್ ಔಟ್"
  },
  ml: {
    "Components": "ഘടകങ്ങൾ",
    "Student Dashboard": "വിദ്യാർത്ഥി ഡാഷ്ബോർഡ്",
    "Teacher Panel": "അധ്യാപക പാനൽ",
    "Submit Project": "പ്രോജക്റ്റ് സമർപ്പിക്കുക",
    "Rename": "പേര് മാറ്റുക",
    "Run Logic": "ലോജിക് പ്രവർത്തിപ്പിക്കുക",
    "Reset Outputs": "ഔട്ട്പുട്ടുകൾ റീസെറ്റ് ചെയ്യുക",
    "Auto Wire": "ഓട്ടോ വയർ",
    "Toggle Grid": "ഗ്രിഡ് മാറ്റുക",
    "Save": "സേവ്",
    "Clear": "ക്ലിയർ",
    "Student": "വിദ്യാർത്ഥി",
    "Teacher": "അധ്യാപകൻ",
    "DIY Components": "DIY ഘടകങ്ങൾ",
    "Dashboard": "ഡാഷ്ബോർഡ്",
    "Battery": "ബാറ്ററി",
    "Motor": "മോട്ടോർ",
    "Switch": "സ്വിച്ച്",
    "LED": "എൽഇഡി",
    "Buzzer": "ബസർ",
    "Language": "ഭാഷ",
    "AI Teacher": "AI അധ്യാപകൻ",
    "Logout": "ലോഗ് ഔട്ട്"
  },
  bn: {
    "Components": "উপাদান",
    "Student Dashboard": "শিক্ষার্থী ড্যাশবোর্ড",
    "Teacher Panel": "শিক্ষক প্যানেল",
    "Submit Project": "প্রোজেক্ট জমা দিন",
    "Rename": "নাম বদলান",
    "Run Logic": "লজিক চালান",
    "Reset Outputs": "আউটপুট রিসেট করুন",
    "Auto Wire": "অটো ওয়্যার",
    "Toggle Grid": "গ্রিড বদলান",
    "Save": "সেভ",
    "Clear": "ক্লিয়ার",
    "Student": "শিক্ষার্থী",
    "Teacher": "শিক্ষক",
    "DIY Components": "DIY উপাদান",
    "Dashboard": "ড্যাশবোর্ড",
    "Battery": "ব্যাটারি",
    "Motor": "মোটর",
    "Switch": "সুইচ",
    "LED": "এলইডি",
    "Buzzer": "বাজার",
    "Language": "ভাষা",
    "AI Teacher": "AI শিক্ষক",
    "Logout": "লগ আউট"
  },
  mr: {
    "Components": "घटक",
    "Student Dashboard": "विद्यार्थी डॅशबोर्ड",
    "Teacher Panel": "शिक्षक पॅनेल",
    "Submit Project": "प्रोजेक्ट सबमिट करा",
    "Rename": "नाव बदला",
    "Run Logic": "लॉजिक चालवा",
    "Reset Outputs": "आउटपुट रीसेट करा",
    "Auto Wire": "ऑटो वायर",
    "Toggle Grid": "ग्रिड बदला",
    "Save": "सेव्ह",
    "Clear": "क्लिअर",
    "Student": "विद्यार्थी",
    "Teacher": "शिक्षक",
    "DIY Components": "DIY घटक",
    "Dashboard": "डॅशबोर्ड",
    "Battery": "बॅटरी",
    "Motor": "मोटर",
    "Switch": "स्विच",
    "LED": "एलईडी",
    "Buzzer": "बझर",
    "Language": "भाषा",
    "AI Teacher": "AI शिक्षक",
    "Logout": "लॉग आउट"
  },
  gu: {
    "Components": "ઘટકો",
    "Student Dashboard": "વિદ્યાર્થી ડેશબોર્ડ",
    "Teacher Panel": "શિક્ષક પેનલ",
    "Submit Project": "પ્રોજેક્ટ સબમિટ કરો",
    "Rename": "નામ બદલો",
    "Run Logic": "લોજિક ચલાવો",
    "Reset Outputs": "આઉટપુટ રીસેટ કરો",
    "Auto Wire": "ઓટો વાયર",
    "Toggle Grid": "ગ્રિડ બદલો",
    "Save": "સેવ",
    "Clear": "ક્લિયર",
    "Student": "વિદ્યાર્થી",
    "Teacher": "શિક્ષક",
    "DIY Components": "DIY ઘટકો",
    "Dashboard": "ડેશબોર્ડ",
    "Battery": "બેટરી",
    "Motor": "મોટર",
    "Switch": "સ્વિચ",
    "LED": "એલઇડી",
    "Buzzer": "બઝર",
    "Language": "ભાષા",
    "AI Teacher": "AI શિક્ષક",
    "Logout": "લૉગ આઉટ"
  },
  pa: {
    "Components": "ਘਟਕ",
    "Student Dashboard": "ਵਿਦਿਆਰਥੀ ਡੈਸ਼ਬੋਰਡ",
    "Teacher Panel": "ਅਧਿਆਪਕ ਪੈਨਲ",
    "Submit Project": "ਪ੍ਰੋਜੈਕਟ ਜਮ੍ਹਾ ਕਰੋ",
    "Rename": "ਨਾਮ ਬਦਲੋ",
    "Run Logic": "ਲਾਜਿਕ ਚਲਾਓ",
    "Reset Outputs": "ਆਉਟਪੁੱਟ ਰੀਸੈਟ ਕਰੋ",
    "Auto Wire": "ਆਟੋ ਵਾਇਰ",
    "Toggle Grid": "ਗ੍ਰਿਡ ਬਦਲੋ",
    "Save": "ਸੇਵ",
    "Clear": "ਕਲੀਅਰ",
    "Student": "ਵਿਦਿਆਰਥੀ",
    "Teacher": "ਅਧਿਆਪਕ",
    "DIY Components": "DIY ਘਟਕ",
    "Dashboard": "ਡੈਸ਼ਬੋਰਡ",
    "Battery": "ਬੈਟਰੀ",
    "Motor": "ਮੋਟਰ",
    "Switch": "ਸਵਿੱਚ",
    "LED": "ਐਲਈਡੀ",
    "Buzzer": "ਬਜ਼ਰ",
    "Language": "ਭਾਸ਼ਾ",
    "AI Teacher": "AI ਅਧਿਆਪਕ",
    "Logout": "ਲੌਗ ਆਉਟ"
  },
  ur: {
    "Components": "اجزا",
    "Student Dashboard": "طالب علم ڈیش بورڈ",
    "Teacher Panel": "استاد پینل",
    "Submit Project": "پروجیکٹ جمع کریں",
    "Rename": "نام بدلیں",
    "Run Logic": "لاجک چلائیں",
    "Reset Outputs": "آؤٹ پٹ ری سیٹ کریں",
    "Auto Wire": "آٹو وائر",
    "Toggle Grid": "گرڈ بدلیں",
    "Save": "محفوظ کریں",
    "Clear": "صاف کریں",
    "Student": "طالب علم",
    "Teacher": "استاد",
    "DIY Components": "DIY اجزا",
    "Dashboard": "ڈیش بورڈ",
    "Battery": "بیٹری",
    "Motor": "موٹر",
    "Switch": "سوئچ",
    "LED": "ایل ای ڈی",
    "Buzzer": "بزر",
    "Language": "زبان",
    "AI Teacher": "AI استاد",
    "Logout": "لاگ آؤٹ"
  },
  or: {
    "Components": "ଉପାଦାନ",
    "Student Dashboard": "ଛାତ୍ର ଡ୍ୟାଶବୋର୍ଡ",
    "Teacher Panel": "ଶିକ୍ଷକ ପ୍ୟାନେଲ",
    "Submit Project": "ପ୍ରୋଜେକ୍ଟ ଦାଖଲ କରନ୍ତୁ",
    "Rename": "ନାମ ବଦଳାନ୍ତୁ",
    "Run Logic": "ଲଜିକ ଚଲାନ୍ତୁ",
    "Reset Outputs": "ଆଉଟପୁଟ ରିସେଟ କରନ୍ତୁ",
    "Auto Wire": "ଅଟୋ ୱାୟର",
    "Toggle Grid": "ଗ୍ରିଡ ବଦଳାନ୍ତୁ",
    "Save": "ସେଭ",
    "Clear": "କ୍ଲିୟର",
    "Student": "ଛାତ୍ର",
    "Teacher": "ଶିକ୍ଷକ",
    "DIY Components": "DIY ଉପାଦାନ",
    "Dashboard": "ଡ୍ୟାଶବୋର୍ଡ",
    "Battery": "ବ୍ୟାଟେରୀ",
    "Motor": "ମୋଟର",
    "Switch": "ସ୍ୱିଚ",
    "LED": "ଏଲଇଡି",
    "Buzzer": "ବଜର",
    "Language": "ଭାଷା",
    "AI Teacher": "AI ଶିକ୍ଷକ",
    "Logout": "ଲଗ ଆଉଟ"
  },
  as: {
    "Components": "উপাদান",
    "Student Dashboard": "শিক্ষাৰ্থী ডেশ্বব'ৰ্ড",
    "Teacher Panel": "শিক্ষক পেনেল",
    "Submit Project": "প্ৰকল্প জমা দিয়ক",
    "Rename": "নাম সলনি কৰক",
    "Run Logic": "লজিক চলাওক",
    "Reset Outputs": "আউটপুট ৰিছেট কৰক",
    "Auto Wire": "অটো ৱায়াৰ",
    "Toggle Grid": "গ্ৰিড সলনি কৰক",
    "Save": "ছেভ",
    "Clear": "ক্লিয়াৰ",
    "Student": "শিক্ষাৰ্থী",
    "Teacher": "শিক্ষক",
    "DIY Components": "DIY উপাদান",
    "Dashboard": "ডেশ্বব'ৰ্ড",
    "Battery": "বেটাৰী",
    "Motor": "মটৰ",
    "Switch": "চুইচ",
    "LED": "এলইডি",
    "Buzzer": "বাজাৰ",
    "Language": "ভাষা",
    "AI Teacher": "AI শিক্ষক",
    "Logout": "লগ আউট"
  }
};

LANGUAGE_OPTIONS.forEach(language => {
  if (language.code !== "en") {
    translations[language.code] = {
      Language: language.label,
      ...(translations[language.code] || {})
    };
  }
});

const TRANSLATABLE_TEXT_KEYS = new Set(
  Object.values(translations).flatMap(language => Object.keys(language))
);
const DYNAMIC_TEXT_IDS = new Set([
  "activeUserPill",
  "zoomDisplay",
  "toast",
  "statusText",
  "gradeText",
  "projectNameText",
  "batteryVoltageValue",
  "ledStateText",
  "motorStateText",
  "buzzerStateText",
  "coachStatusText",
  "coachHintText",
  "coachFixText",
  "teacherSubmissionState",
  "teacherGradeState",
  "teacherComponentCount",
  "teacherWireCount",
  "teacherLogicCount"
]);

if (!LANGUAGE_CODES.has(state.lang)) {
  state.lang = "en";
}

function getLanguageOption(code = state.lang) {
  return LANGUAGE_OPTIONS.find(language => language.code === code) || LANGUAGE_OPTIONS[0];
}

function translateText(original, lang = state.lang) {
  const key = String(original || "").trim();
  if (!key || lang === "en") return key;
  return translations[lang]?.[key] || key;
}

function renderLanguageOptions() {
  const select = document.getElementById("languageSelect");
  if (!select) return;
  const selectedCode = LANGUAGE_CODES.has(state.lang) ? state.lang : "en";
  select.replaceChildren(...LANGUAGE_OPTIONS.map(language => new Option(language.label, language.code)));
  select.value = selectedCode;
}

function applyLanguage(){
  const lang = state.lang;
  renderLanguageOptions();

  document.querySelectorAll("[data-en]").forEach(el => {
const original = el.getAttribute("data-en");
el.textContent = translateText(original, lang);
  });
}

const componentCatalog = [
  { type:"Battery", icon:"🔋", desc:"Power source with + and - terminals", color:"#2563eb", ports:["negative","positive"], minVoltage:0 },
  { type:"LED", icon:"💡", desc:"Visual output", color:"#ef4444", ports:["negative","positive"], minVoltage:2 },
  { type:"Motor", icon:"⚙️", desc:"Rotating output", color:"#16a34a", ports:["negative","positive"], minVoltage:6 },
  { type:"Switch", icon:"🎚️", desc:"Input control", color:"#f59e0b", ports:["negative","positive"], minVoltage:0 },
  { type:"Buzzer", icon:"🔔", desc:"Sound output", color:"#8b5cf6", ports:["negative","positive"], minVoltage:3 },
  { type:"Resistor", icon:"🧱", desc:"Current limiter", color:"#64748b", ports:["negative","positive"], minVoltage:0 },
  { type:"Capacitor", icon:"📦", desc:"Energy storage", color:"#0ea5e9", ports:["negative","positive"], minVoltage:0 },
  { type:"Relay", icon:"📡", desc:"Switching element", color:"#10b981", ports:["negative","positive"], minVoltage:5 },
  { type:"Soil Sensor", icon:"🌱", desc:"Moisture input", color:"#22c55e", ports:["negative","positive"], minVoltage:3.3 },
  { type:"Light Sensor", icon:"☀️", desc:"Brightness input", color:"#f59e0b", ports:["negative","positive"], minVoltage:3.3 },
  { type:"Temp Sensor", icon:"🌡️", desc:"Temperature input", color:"#ef4444", ports:["negative","positive"], minVoltage:3.3 },
  { type:"Pump", icon:"🚰", desc:"Water output", color:"#06b6d4", ports:["negative","positive"], minVoltage:6 },
  { type:"Servo", icon:"🦾", desc:"Angle motor", color:"#3b82f6", ports:["negative","positive"], minVoltage:5 }
];

const logicCatalog = [
  "ON",
  "OFF",
  "WAIT 1s"
];

const loginScreen = document.getElementById("loginScreen");
const loginName = document.getElementById("loginName");
const loginEmail = document.getElementById("loginEmail");
const loginRole = document.getElementById("loginRole");
const loginClass = document.getElementById("loginClass");
const loginSchool = document.getElementById("loginSchool");
const loginSchoolUser = document.getElementById("loginSchoolUser");
const loginSchoolPass = document.getElementById("loginSchoolPass");
const loginCard = document.querySelector(".premium-login-card");
const authFormTitle = document.getElementById("authFormTitle");
const authModeNote = document.getElementById("authModeNote");
const authCreateModeBtn = document.getElementById("authCreateModeBtn");
const authLoginModeBtn = document.getElementById("authLoginModeBtn");
const googleAuthBtn = document.getElementById("googleAuthBtn");
const loginBackStepBtn = document.getElementById("loginBackStepBtn");
const toggleLoginPasswordBtn = document.getElementById("toggleLoginPasswordBtn");
const rememberLogin = document.getElementById("rememberLogin");
const enterBtn = document.getElementById("enterBtn");
const demoStudentBtn = document.getElementById("demoStudentBtn");
const demoTeacherBtn = document.getElementById("demoTeacherBtn");
const activeUserPill = document.getElementById("activeUserPill");

const componentGrid = document.getElementById("componentGrid");
const logicBlockList = document.getElementById("logicBlockList");
const itemsLayer = document.getElementById("itemsLayer");
const deleteBin = document.getElementById("deleteBin");
const wireLayer = document.getElementById("wireLayer");
const logicList = document.getElementById("logicList");
const logicDock = document.getElementById("logicDock");
const canvasWorld = document.getElementById("canvasWorld");
const workspaceArea = document.getElementById("workspaceArea");
const zoomDisplay = document.getElementById("zoomDisplay");
const toast = document.getElementById("toast");
const projectRenameModal = document.getElementById("projectRenameModal");
const projectRenameForm = document.getElementById("projectRenameForm");
const projectRenameInput = document.getElementById("projectRenameInput");
const projectRenameCloseBtn = document.getElementById("projectRenameCloseBtn");
const projectRenameCancelBtn = document.getElementById("projectRenameCancelBtn");
const batteryVoltageValue = document.getElementById("batteryVoltageValue");
const batteryVoltageRange = document.getElementById("batteryVoltageRange");
const voltageGuideList = document.getElementById("voltageGuideList");
const aiTeacherPage = document.getElementById("aiTeacherPage");
const aiTeacherMessages = document.getElementById("aiTeacherMessages");
const aiTeacherInput = document.getElementById("aiTeacherInput");
const aiTeacherSendBtn = document.getElementById("aiTeacherSendBtn");
const aiTeacherContext = document.getElementById("aiTeacherContext");

const studentPanel = document.getElementById("studentPanel");
const teacherPanel = document.getElementById("teacherPanel");
const studentModeBtn = document.getElementById("studentModeBtn");
const teacherModeBtn = document.getElementById("teacherModeBtn");

function trackEducircuitPage(pagePath, pageTitle, options = {}) {
  window.EducircuitAnalytics?.trackPageView({
    pagePath,
    pageTitle,
    force: Boolean(options.force)
  });
}

function getCurrentEducircuitView() {
  const landingPage = document.getElementById("landingPage");
  const guidePage = document.getElementById("guidePage");
  const projectsPage = document.getElementById("projectsPage");
  const studentProjectsPage = document.getElementById("studentProjectsPage");
  const exploreProjectsPage = document.getElementById("exploreProjectsPage");

  if (guidePage && !guidePage.classList.contains("hidden")) {
    return { path: "/guide", title: "Educircuit | Guide" };
  }
  if (exploreProjectsPage && !exploreProjectsPage.classList.contains("hidden")) {
    return { path: "/explore", title: "Educircuit | Explore Projects" };
  }
  if (projectsPage && !projectsPage.classList.contains("hidden")) {
    return { path: "/my-projects", title: "Educircuit | My Projects" };
  }
  if (studentProjectsPage && !studentProjectsPage.classList.contains("hidden")) {
    return { path: "/student-projects", title: "Educircuit | Student Projects" };
  }
  if (aiTeacherPage && !aiTeacherPage.classList.contains("hidden")) {
    return { path: "/ai-teacher", title: "Educircuit | AI Teacher" };
  }
  if (loginScreen && !loginScreen.classList.contains("hidden")) {
    return { path: "/login", title: "Educircuit | Login" };
  }
  if (landingPage && !landingPage.classList.contains("hidden")) {
    return { path: "/landing", title: "Educircuit | Landing" };
  }
  return { path: "/lab", title: "Educircuit | Circuit Lab" };
}

function syncEducircuitPageView(options = {}) {
  const view = getCurrentEducircuitView();
  trackEducircuitPage(view.path, view.title, options);
}

const statusText = document.getElementById("statusText");
const gradeText = document.getElementById("gradeText");
const projectNameText = document.getElementById("projectNameText");
const dashboardLed = document.getElementById("dashboardLed");
const dashboardMotor = document.getElementById("dashboardMotor");
const dashboardBuzzer = document.getElementById("dashboardBuzzer");
const ledStateText = document.getElementById("ledStateText");
const motorStateText = document.getElementById("motorStateText");
const buzzerStateText = document.getElementById("buzzerStateText");
const coachStatusText = document.getElementById("coachStatusText");
const coachHintText = document.getElementById("coachHintText");
const coachFixText = document.getElementById("coachFixText");

const teacherSubmissionState = document.getElementById("teacherSubmissionState");
const teacherGradeState = document.getElementById("teacherGradeState");
const teacherGradeInput = document.getElementById("teacherGrade");
const teacherCommentInput = document.getElementById("teacherComment");
const teacherComponentCount = document.getElementById("teacherComponentCount");
const teacherWireCount = document.getElementById("teacherWireCount");
const teacherLogicCount = document.getElementById("teacherLogicCount");
const LOAD_COMPONENTS = {
  LED: 1,
  Buzzer: 1,
  Motor: 2,
  Pump: 2,
  Servo: 2
};
const POWER_FLOW_COMPONENTS = new Set(componentCatalog
  .filter(component => component.type !== "Battery" && component.ports.length >= 2)
  .map(component => component.type));
const CONDUCTOR_COMPONENTS = new Set(["Switch", "Relay", "Resistor", "Capacitor"]);
const HARD_SHORT_COMPONENTS = new Set(["Switch", "Relay", "Capacitor"]);

function deepClone(value){
  return JSON.parse(JSON.stringify(value));
}

function normalizeKey(value){
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSchoolDocId(school){
  return normalizeKey(school) || "default-school";
}

function getMemberCollectionName(role){
  return role === "teacher" ? "teachers" : role === "admin" ? "admins" : "students";
}

function ensureSchoolContainer(school){
  if(!state.schools[school]){
    state.schools[school] = { students: [], teachers: [] };
  } else {
    state.schools[school].students = state.schools[school].students || [];
    state.schools[school].teachers = state.schools[school].teachers || [];
  }
  return state.schools[school];
}

function getAuthMode(){
  return window.EducircuitAuthFlow?.getMode?.() || loginCard?.dataset.authMode || "create";
}

function openAuthMode(mode){
  if(window.EducircuitAuthFlow?.openAuthMode){
    window.EducircuitAuthFlow.openAuthMode(mode);
  } else {
    const nextMode = mode === "login" ? "login" : "create";
    loginCard?.setAttribute("data-auth-mode", nextMode);
    loginCard?.setAttribute("data-step", "2");
    document.querySelectorAll(".login-step").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.loginStep === "2");
    });
    document.getElementById("loginStepOne")?.classList.remove("active");
    document.getElementById("loginStepTwo")?.classList.add("active");
  }
  syncRoleFields();
}

function syncRoleFields(){
  const isFaculty = loginRole.value === "teacher" || loginRole.value === "admin";
  const isCreate = getAuthMode() === "create";
  const activeEnterBtn = document.getElementById("enterBtn");
  loginClass.placeholder = isFaculty ? "Department / Staff (optional)" : "10-A";
  loginClass.previousElementSibling.textContent = isFaculty ? "Department / Section" : "Class / Section";
  if(authFormTitle){
    authFormTitle.textContent = isCreate ? "Create Account" : "Log In";
  }
  if(activeEnterBtn){
    activeEnterBtn.textContent = isCreate ? "Create Account" : "Log In";
    activeEnterBtn.setAttribute("aria-label", isCreate ? "Create Educircuit account" : "Log in to Educircuit");
  }
  if(authModeNote){
    authModeNote.textContent = isCreate
      ? "Fill this once to create your Educircuit classroom account."
      : "Enter your school code, email, and password to open your lab.";
  }
}

function clearLoginErrors(){
  [loginName, loginEmail, loginRole, loginClass, loginSchool, loginSchoolUser, loginSchoolPass].forEach(input => {
    input.classList.remove("error");
  });
}

function syncLoginPasswordToggle(){
  const isVisible = loginSchoolPass.type === "text";
  toggleLoginPasswordBtn.textContent = isVisible ? "Hide" : "Show";
  toggleLoginPasswordBtn.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
  toggleLoginPasswordBtn.setAttribute("aria-pressed", String(isVisible));
}

function showLoginChooser(){
  clearLoginErrors();
  loginSchoolPass.type = "password";
  rememberLogin.checked = false;
  syncLoginPasswordToggle();
  loginScreen.classList.remove("hidden");
  loginCard?.setAttribute("data-step", "1");
  window.EducircuitAuthFlow?.setMode?.("create");
  window.EducircuitAuthFlow?.goToLoginStep?.(1);
  document.querySelectorAll(".login-step").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.loginStep === "1");
  });
  document.getElementById("loginStepOne")?.classList.add("active");
  document.getElementById("loginStepTwo")?.classList.remove("active");
  syncRoleFields();
  syncEducircuitPageView({ force: true });
}

async function configureAuthPersistence(remember = false){
  if(typeof auth.setPersistence !== "function") return;
  const persistence = remember
    ? firebaseApi.auth.Auth?.Persistence?.LOCAL
    : firebaseApi.auth.Auth?.Persistence?.SESSION;
  if(!persistence) return;
  await auth.setPersistence(persistence);
}

function getLoginPayload(){
  return {
    name: loginName.value.trim(),
    email: loginEmail.value.trim().toLowerCase(),
    role: loginRole.value,
    className: loginClass.value.trim(),
    school: loginSchool.value.trim(),
    schoolUsername: loginSchoolUser.value.trim(),
    schoolPassword: loginSchoolPass.value,
    accessModel: getAuthMode()
  };
}

function validateLoginPayload(payload){
  clearLoginErrors();
  let hasError = false;

  if(payload.accessModel === "create" && payload.name.length < 3){
    loginName.classList.add("error");
    hasError = true;
  }

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)){
    loginEmail.classList.add("error");
    hasError = true;
  }

  if(payload.accessModel === "create" && !payload.role){
    loginRole.classList.add("error");
    hasError = true;
  }

  if(payload.accessModel === "create" && !payload.school){
    loginSchool.classList.add("error");
    hasError = true;
  }

  if(!payload.schoolUsername){
    loginSchoolUser.classList.add("error");
    hasError = true;
  }

  if(!payload.schoolPassword){
    loginSchoolPass.classList.add("error");
    hasError = true;
  }

  if(payload.accessModel === "create" && payload.schoolPassword.length > 0 && payload.schoolPassword.length < 6){
    loginSchoolPass.classList.add("error");
    hasError = true;
  }

  if(payload.accessModel === "create" && payload.role === "student" && !payload.className){
    loginClass.classList.add("error");
    hasError = true;
  }

  return !hasError;
}

function formatFirebaseAuthError(error, action = "login", role = "student"){
  const code = error?.code || "";
  const message = error?.message || "";
  const isAdmin = role === "admin";

  if(code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password"){
    return isAdmin
      ? "No matching admin account was found. Check the email and password, or create the school admin account first."
      : "No matching account was found. Check the email and password, or choose Create Account if this is your first time.";
  }
  if(code === "auth/email-already-in-use"){
    return "That email already has an Educircuit account. Choose Log In and use the same email and password.";
  }
  if(code === "auth/weak-password"){
    return "Use a stronger password with at least 6 characters.";
  }
  if(code === "auth/invalid-email"){
    return "Enter a valid email address before continuing.";
  }
  if(code === "auth/school-code-mismatch"){
    return "That school code does not match this account. Check the code and try again.";
  }
  if(code === "auth/operation-not-allowed"){
    return "Email and password accounts are not enabled in Firebase yet.";
  }
  if(code === "auth/network-request-failed"){
    return "The network interrupted Firebase. Check your connection and try again.";
  }
  if(code === "permission-denied" || code === "firestore/permission-denied"){
    return "Firebase blocked this account action. Check the school code and role, then try again.";
  }
  if(/school already/i.test(message) && action === "create"){
    return "This school already exists. Choose Log In, or use a different school code for a new school.";
  }
  return message || "Something went wrong while signing in. Check the details and try again.";
}

function ensureLocalUserRecord(profile){
  const schoolBucket = ensureSchoolContainer(profile.school);
  const collectionName = profile.role === "teacher" || profile.role === "admin" ? "teachers" : "students";
  const userBucket = schoolBucket[collectionName];
  let userRecord = userBucket.find(person => person.name === profile.name);

  if(!userRecord){
    userRecord = {
      name: profile.name,
      class: profile.className || "",
      role: profile.role,
      projects: []
    };
    userBucket.push(userRecord);
  }

  return userRecord;
}

function applyAuthenticatedProfile(uid, profile, options = {}){
  if(options.demo === true || String(uid || "").startsWith("demo-")){
    state.demoMode = true;
  } else {
    state.demoMode = false;
  }

  state.user.uid = uid;
  state.user.name = profile.name;
  state.user.role = profile.role;
  state.user.className = profile.className || "";
  state.user.school = profile.school;
  state.user.schoolKey = profile.schoolKey || getSchoolDocId(profile.school);
  state.user.schoolUsername = profile.schoolUsername || "";
  state.projectOwnerName = profile.name;

  ensureLocalUserRecord(profile);

  activeUserPill.textContent = `${profile.name} • ${profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}`;
  loginScreen.classList.add("hidden");
  setMode(profile.role);
  projectNameText.textContent = state.projectName;
  syncEducircuitPageView({ force: true });
}

async function fetchUserProfile(uid){
  const doc = await db.collection("users").doc(uid).get();
  return doc.exists ? doc.data() : null;
}

async function signUpUser(){
  const payload = getLoginPayload();
  if(!validateLoginPayload(payload)){
    showToast("Please fill all fields correctly");
    return;
  }

  const schoolKey = getSchoolDocId(payload.schoolUsername || payload.school);
  let credential = null;
  let createdAuthUser = false;
  let registrationCommitted = false;

  try{
    await configureAuthPersistence(false);
    try{
      credential = await auth.createUserWithEmailAndPassword(payload.email, payload.schoolPassword);
      createdAuthUser = true;
    } catch(error){
      if(error?.code !== "auth/email-already-in-use" || typeof auth.signInWithEmailAndPassword !== "function"){
        throw error;
      }

      try{
        credential = await auth.signInWithEmailAndPassword(payload.email, payload.schoolPassword);
      } catch{
        throw error;
      }

      const existingProfile = await fetchUserProfile(credential.user.uid);
      if(existingProfile){
        await auth.signOut();
        throw error;
      }
    }

    const schoolRef = db.collection("schools").doc(schoolKey);
    const schoolDoc = await schoolRef.get();
    const schoolData = schoolDoc.exists ? schoolDoc.data() : null;
    const adminIds = Array.isArray(schoolData?.adminIds) ? schoolData.adminIds : [];
    const canonicalSchoolName = String(schoolData?.name || payload.school).trim();

    if(payload.role === "admin" && adminIds.length){
      throw new Error("This school already has an admin. Choose Log In to use that account.");
    }

    const cred = credential;
    const collectionName = getMemberCollectionName(payload.role);
    const profilePath = `schools/${schoolKey}/${collectionName}/${cred.user.uid}`;
    const batch = db.batch();
    const profile = {
      uid: cred.user.uid,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      className: payload.className,
      school: canonicalSchoolName,
      schoolKey,
      schoolId: schoolKey,
      schoolUsername: payload.schoolUsername,
      profilePath,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if(schoolDoc.exists){
      batch.set(schoolRef, {
        id: schoolKey,
        name: canonicalSchoolName,
        adminIds: payload.role === "admin" ? firebaseApi.firestore.FieldValue.arrayUnion(cred.user.uid) : adminIds,
        updatedAt: new Date(),
        leaderboardEnabled: schoolData?.leaderboardEnabled ?? true
      }, { merge: true });
    } else {
      batch.set(schoolRef, {
        id: schoolKey,
        name: canonicalSchoolName,
        adminIds: payload.role === "admin" ? [cred.user.uid] : [],
        createdAt: new Date(),
        updatedAt: new Date(),
        leaderboardEnabled: true,
        selfServiceSignup: payload.role !== "admin",
        createdBy: cred.user.uid,
        createdByRole: payload.role
      });
    }

    batch.set(schoolRef.collection(collectionName).doc(cred.user.uid), profile);
    batch.set(db.collection("users").doc(cred.user.uid), profile);
    await batch.commit();
    registrationCommitted = true;

    applyAuthenticatedProfile(cred.user.uid, profile);
    showToast("Account created safely");
  } catch(error){
    if(credential?.user && !registrationCommitted){
      try{
        if(createdAuthUser){
          await credential.user.delete?.();
        } else {
          await auth.signOut();
        }
      } catch(cleanupError){
        console.warn("Could not clean up incomplete Firebase registration", cleanupError);
      }
    }
    showToast(formatFirebaseAuthError(error, "create", payload.role));
  }
}

async function loginUser(){
  const payload = getLoginPayload();
  if(!validateLoginPayload(payload)){
    showToast("Please fill all fields correctly");
    return;
  }

  try{
    await configureAuthPersistence(rememberLogin.checked);
    const cred = await auth.signInWithEmailAndPassword(payload.email, payload.schoolPassword);
    const profile = await fetchUserProfile(cred.user.uid);

    if(!profile){
      await auth.signOut();
      showToast("This account exists, but its Educircuit classroom profile is missing. Ask the school admin to repair it.");
      return;
    }

    const suppliedSchoolKey = getSchoolDocId(payload.schoolUsername);
    const profileSchoolKey = profile.schoolId || profile.schoolKey || getSchoolDocId(profile.school);
    if(suppliedSchoolKey !== profileSchoolKey){
      const error = new Error("The supplied school code does not match this account.");
      error.code = "auth/school-code-mismatch";
      await auth.signOut();
      throw error;
    }

    applyAuthenticatedProfile(cred.user.uid, profile);
    showToast("Welcome, " + profile.name);
  } catch(error){
    showToast(formatFirebaseAuthError(error, "login", payload.role));
  }
}

async function loginWithGoogle(){
  if(!firebaseApi.auth.GoogleAuthProvider || !auth.signInWithPopup){
    showToast("Google sign-in is not available for this project yet.");
    return;
  }

  try{
    await configureAuthPersistence(false);
    const provider = new firebaseApi.auth.GoogleAuthProvider();
    const credential = await auth.signInWithPopup(provider);
    const profile = await fetchUserProfile(credential.user.uid);

    if(!profile){
      await auth.signOut();
      showToast("No Educircuit profile is linked to this Google account yet. Create an account with email and password first.");
      return;
    }

    applyAuthenticatedProfile(credential.user.uid, profile);
    showToast("Welcome, " + profile.name);
  } catch(error){
    showToast(error?.code === "auth/operation-not-allowed"
      ? "Google sign-in is not enabled in Firebase yet."
      : error.message || "Google sign-in could not finish.");
  }
}

async function logoutUser(){
  if(state.demoMode){
    resetAuthenticatedUser();
    return;
  }

  try{
    await auth.signOut();
  } catch(error){
    showToast(error.message || "Could not log out right now");
  }
}

function resetAuthenticatedUser(){
  state.demoMode = false;
  state.user.uid = "";
  state.user.name = "";
  state.user.role = "student";
  state.user.className = "";
  state.user.school = "";
  state.user.schoolKey = "";
  state.user.schoolUsername = "";
  state.projectOwnerName = "";
  loginRole.value = "student";
  setMode("student");
  activeUserPill.textContent = "Not logged in";
  showLoginChooser();
}

function syncNextId(){
  const maxId = state.items.reduce((max, item) => {
    const numericId = Number(String(item.id).replace("item-", ""));
    return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
  }, 0);
  state.nextId = maxId + 1;
}

function getNodeKey(itemId, port){
  return `${itemId}:${port}`;
}

function connectNodes(graph, a, b){
  if(!graph.has(a)) graph.set(a, new Set());
  if(!graph.has(b)) graph.set(b, new Set());
  graph.get(a).add(b);
  graph.get(b).add(a);
}

function isComponentClosed(item){
  if(item.type === "Switch" || item.type === "Relay"){
    return Boolean(item.isClosed);
  }
  return true;
}

function buildConnectionGraph(bridgeTypes){
  const graph = new Map();

  state.wires.forEach(wire => {
    connectNodes(
      graph,
      getNodeKey(wire.from.itemId, wire.from.port),
      getNodeKey(wire.to.itemId, wire.to.port)
    );
  });

  state.items.forEach(item => {
    if(!bridgeTypes.has(item.type)) return;
    if(item.ports.length < 2) return;
    if(!isComponentClosed(item)) return;
    connectNodes(
      graph,
      getNodeKey(item.id, item.ports[0]),
      getNodeKey(item.id, item.ports[1])
    );
  });

  return graph;
}

function collectReachable(startNodes, graph){
  const visited = new Set();
  const queue = [...startNodes];

  while(queue.length){
    const node = queue.shift();
    if(visited.has(node)) continue;
    visited.add(node);

    const neighbors = graph.get(node);
    if(!neighbors) continue;

    neighbors.forEach(neighbor => {
      if(!visited.has(neighbor)){
        queue.push(neighbor);
      }
    });
  }

  return visited;
}

function getCorrectionGuide(){
  return "Correct connection: Battery + -> first component +, then each component - connects to the next component +, and the final component - returns to Battery -.";
}

function buildCoachState(status, hint, fix){
  return { status, hint, fix };
}

function evaluateCircuitState(){
  if(window.EducircuitUpgrade?.evaluateCircuitState){
    return window.EducircuitUpgrade.evaluateCircuitState();
  }

  if(window.EducircuitSimulation?.evaluateCircuitState){
    return window.EducircuitSimulation.evaluateCircuitState({
      state,
      getCatalog,
      buildCoachState,
      getCorrectionGuide,
      buildConnectionGraph,
      collectReachable,
      getNodeKey,
      LOAD_COMPONENTS,
      POWER_FLOW_COMPONENTS,
      HARD_SHORT_COMPONENTS
    });
  }

  const batteries = state.items.filter(item => item.type === "Battery");
  if(!batteries.length){
    return {
      led:false,
      motor:false,
      buzzer:false,
      overload:false,
      burstItems:[],
      message:"Add a battery to power the circuit.",
      coach: buildCoachState("Need Battery", "Your circuit has no power source yet.", "Add a battery, then connect Battery + to a component + and return the final component - to Battery -.")
    };
  }

  const batteryVoltage = batteries.reduce((max, item) => {
    const voltage = Number(item.voltage ?? state.defaultBatteryVoltage);
    return Math.max(max, voltage);
  }, 0);

  const powerGraph = buildConnectionGraph(POWER_FLOW_COMPONENTS);
  const shortGraph = buildConnectionGraph(HARD_SHORT_COMPONENTS);
  const positiveStarts = batteries.map(item => getNodeKey(item.id, "positive"));
  const negativeStarts = batteries.map(item => getNodeKey(item.id, "negative"));
  const positiveReachable = collectReachable(positiveStarts, powerGraph);
  const negativeReachable = collectReachable(negativeStarts, powerGraph);
  const shortReachable = collectReachable(positiveStarts, shortGraph);
  const samePolarityWire = state.wires.find(wire => {
    const samePortPolarity =
      (wire.from.port === "positive" && wire.to.port === "positive") ||
      (wire.from.port === "negative" && wire.to.port === "negative");
    const fromItem = state.items.find(item => item.id === wire.from.itemId);
    const toItem = state.items.find(item => item.id === wire.to.itemId);

    return samePortPolarity && fromItem?.type !== "Battery" && toItem?.type !== "Battery";
  });

  const activeLoads = [];
  let totalRequiredVoltage = 0;
  const voltageCaps = [];

  state.items.forEach(item => {
    if(!(item.type in LOAD_COMPONENTS) || item.ports.length < 2) return;
    const cfg = getCatalog(item.type);

    const positiveTerminal = getNodeKey(item.id, "positive");
    const negativeTerminal = getNodeKey(item.id, "negative");
    const positivePowered = positiveReachable.has(positiveTerminal);
    const negativeReturned = negativeReachable.has(negativeTerminal);
    const meetsVoltage = batteryVoltage >= (cfg?.minVoltage ?? 0);
    const isPowered = positivePowered && negativeReturned && meetsVoltage;

    if(isPowered){
      activeLoads.push(item);
      totalRequiredVoltage += cfg?.minVoltage ?? 0;
      voltageCaps.push({
        item,
        limit: (cfg?.minVoltage ?? 0) * 2
      });
    }
  });

  const hardShort = negativeStarts.some(node => shortReachable.has(node));
  const totalVoltageLimit = activeLoads.length > 1
    ? totalRequiredVoltage * 2
    : (voltageCaps[0]?.limit ?? Infinity);
  const componentOverload = activeLoads.length === 1
    ? voltageCaps.some(entry => batteryVoltage > entry.limit)
    : false;
  const combinedOverload = activeLoads.length > 1 && batteryVoltage > totalVoltageLimit;
  const overload = hardShort || componentOverload || combinedOverload;
  const burstItems = overload
    ? [...new Set(activeLoads.map(item => item.id))]
    : [];

  let message = "";
  let coach = buildCoachState(
    "Ready",
    "Your circuit layout looks valid. Run logic to test the outputs.",
    getCorrectionGuide()
  );

  if(hardShort){
    message = "Short circuit detected 💥 Fix the wiring and try again.";
    coach = buildCoachState(
      "Short Circuit",
      samePolarityWire
        ? "You connected two same-polarity terminals together, which creates a short circuit."
        : "The circuit path is creating a direct short between battery + and battery -.",
      getCorrectionGuide()
    );
  } else if(componentOverload){
    const overloaded = voltageCaps.find(entry => batteryVoltage > entry.limit);
    message = `${overloaded?.item.type || "Component"} overloaded 💥 Battery voltage is above twice its safe requirement.`;
    coach = buildCoachState(
      "Component Overload",
      `${overloaded?.item.type || "This component"} needs about ${overloaded ? overloaded.limit / 2 : 0}V, so more than ${overloaded?.limit || 0}V is too much for it alone.`,
      `Lower the battery voltage or add more compatible components. Example: a 2V LED should stay at or below 4V when it is the only active load.`
    );
  } else if(combinedOverload){
    message = "The circuit overloaded and burst 💥 The battery voltage is too high for the total active circuit.";
    coach = buildCoachState(
      "Total Voltage Too High",
      `Your active components need about ${totalRequiredVoltage.toFixed(1)}V total, so they are safe up to ${(totalVoltageLimit).toFixed(1)}V together.`,
      `Reduce the battery below ${(totalVoltageLimit).toFixed(1)}V, or add components that match the higher supply.`
    );
  } else if(samePolarityWire){
    coach = buildCoachState(
      "Wrong Polarity Link",
      "You linked + to + or - to -, which is not the normal path for a working circuit.",
      getCorrectionGuide()
    );
  } else if(state.wires.length && activeLoads.length === 0){
    const hasOpenControl = state.items.some(item => (item.type === "Switch" || item.type === "Relay") && !item.isClosed);
    coach = buildCoachState(
      hasOpenControl ? "Control Open" : "Incomplete Loop",
      hasOpenControl
        ? "Your switch or relay is still open, so current cannot pass through the circuit yet."
        : "The circuit does not have a full loop from battery + back to battery -.",
      hasOpenControl
        ? "Run ON logic to close the switch/relay, then test the circuit again."
        : getCorrectionGuide()
    );
  }

  return {
    led: activeLoads.some(item => item.type === "LED") && !overload,
    motor: activeLoads.some(item => ["Motor", "Pump", "Servo"].includes(item.type)) && !overload,
    buzzer: activeLoads.some(item => item.type === "Buzzer") && !overload,
    activeItemIds: activeLoads.map(item => item.id),
    overload,
    burstItems,
    message,
    coach
  };
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove("show"), 1800);
}

function bindTileAction(element, action, label){
  element.setAttribute("role", "button");
  element.setAttribute("tabindex", "0");
  if(label){
    element.setAttribute("aria-label", label);
  }
  element.addEventListener("click", action);
  element.addEventListener("keydown", event => {
    if(event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    action();
  });
}

function renderComponentCards(){
  componentGrid.innerHTML = "";
  componentCatalog.forEach(comp => {
    const card = UI.componentCard(comp);
    bindTileAction(card, () => addComponent(comp.type), `Add ${comp.type} to workspace`);
    componentGrid.appendChild(card);
  });
}

function renderLogicCards(){
  logicBlockList.innerHTML = "";
  logicCatalog.forEach(name => {
    const item = UI.logicCard(name);
    bindTileAction(item, () => addLogic(name), `Add ${name} logic block`);
    logicBlockList.appendChild(item);
  });
}

function getCatalog(type){
  return componentCatalog.find(c => c.type === type);
}

function syncBatteryVoltageControls(){
  batteryVoltageValue.textContent = `${state.defaultBatteryVoltage.toFixed(1)}V`;
  batteryVoltageRange.value = String(state.defaultBatteryVoltage);
}

function syncBatteryVoltageFromItems(){
  const battery = state.items.find(item => item.type === "Battery");
  if(battery){
    state.defaultBatteryVoltage = Number(battery.voltage ?? state.defaultBatteryVoltage);
  }
  syncBatteryVoltageControls();
}

function setBatteryVoltage(voltage){
  state.defaultBatteryVoltage = voltage;
  state.items.forEach(item => {
    if(item.type === "Battery"){
      item.voltage = voltage;
    }
  });
  syncBatteryVoltageControls();
  const simulation = evaluateCircuitState();
  state.outputs.led = simulation.led;
  state.outputs.motor = simulation.motor;
  state.outputs.buzzer = simulation.buzzer;
  state.outputs.overload = simulation.overload;
  state.coach = simulation.coach;
  state.activeItems = simulation.activeItemIds;
  state.burstItems = simulation.burstItems;
  renderItems();
  updateOutputs();
}

function refreshSimulation(){
  const simulation = evaluateCircuitState();

  if(state.logicArmed){
    state.outputs.led = simulation.led;
    state.outputs.motor = simulation.motor;
    state.outputs.buzzer = simulation.buzzer;
    state.outputs.overload = simulation.overload;
    state.coach = simulation.coach;
    state.activeItems = simulation.activeItemIds;
    state.burstItems = simulation.burstItems;
  } else {
    state.outputs.led = false;
    state.outputs.motor = false;
    state.outputs.buzzer = false;
    state.outputs.overload = false;
    state.coach = simulation.coach;
    state.activeItems = [];
    state.burstItems = [];
  }

  updateOutputs();
  updateAiTeacherContext();
  return simulation;
}

function renderVoltageGuide(){
  if(!voltageGuideList) return;
  voltageGuideList.innerHTML = "";

  componentCatalog
    .filter(component => component.type !== "Battery" && component.minVoltage > 0)
    .forEach(component => {
      const row = document.createElement("div");
      row.className = "voltage-row";
      row.innerHTML = `
        <span>${component.icon} ${component.type}</span>
        <b class="voltage-chip">${component.minVoltage}V min</b>
      `;
      voltageGuideList.appendChild(row);
    });
}

function getCircuitSummary(){
  if(!state.items.length){
    return "No components are on the workspace yet.";
  }

  const counts = {};
  state.items.forEach(item => {
    counts[item.type] = (counts[item.type] || 0) + 1;
  });

  const parts = Object.entries(counts).map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`);
  return `${parts.join(", ")}. ${state.wires.length} wire${state.wires.length === 1 ? "" : "s"} connected. Battery set to ${state.defaultBatteryVoltage.toFixed(1)}V.`;
}

function updateAiTeacherContext(){
  if(!aiTeacherContext) return;
  aiTeacherContext.textContent = getCircuitSummary();
}

function addAiTeacherMessage(role, text){
  state.aiTeacherMessages.push({ role, text });
  renderAiTeacherMessages();
}

function renderAiTeacherMessages(){
  if(!aiTeacherMessages) return;
  aiTeacherMessages.innerHTML = "";

  state.aiTeacherMessages.forEach(message => {
    const bubble = document.createElement("div");
    bubble.className = `ai-message ${message.role}`;
    bubble.textContent = message.text;
    aiTeacherMessages.appendChild(bubble);
  });

  aiTeacherMessages.scrollTop = aiTeacherMessages.scrollHeight;
  updateAiTeacherContext();
}

function buildAiTeacherReply(question){
  if(window.EducircuitUpgrade?.buildAiTeacherReply){
    return window.EducircuitUpgrade.buildAiTeacherReply(question);
  }

  const q = question.toLowerCase();
  const battery = state.items.find(item => item.type === "Battery");
  const switches = state.items.filter(item => item.type === "Switch" || item.type === "Relay");
  const activeNames = state.items
    .filter(item => state.activeItems.includes(item.id))
    .map(item => item.type);

  if(q.includes("my circuit") || q.includes("current circuit")){
    return `Here is your current circuit in simple words:\n${getCircuitSummary()}\n\nIf you want, I can also explain what each component is doing one by one.`;
  }

  if(q.includes("voltage") || q.includes("volt")){
    const needs = componentCatalog
      .filter(component => component.minVoltage > 0)
      .map(component => `${component.type}: ${component.minVoltage}V minimum`)
      .join(", ");
    return `Voltage is the electrical push from the battery. Right now your battery is set to ${state.defaultBatteryVoltage.toFixed(1)}V.${battery ? ` Your battery component is showing the same output.` : ""}\n\nUseful minimum voltages:\n${needs}\n\nA component only works when it gets enough voltage and a full path from + to -.`;
  }

  if(q.includes("switch")){
    return `A switch is like a gate in a circuit. When it is open, current cannot pass. When it is closed, current can flow through the path.\n\nIn Educircuit, the ON logic closes switches and relays, and OFF opens them again.`;
  }

  if(q.includes("resistor")){
    return `A resistor limits current. In real circuits, it protects sensitive parts like LEDs from too much current.\n\nIn your simulator, resistors also help reduce overload risk, so they make circuits safer.`;
  }

  if(q.includes("short circuit") || q.includes("burst") || q.includes("overload")){
    return `A short circuit happens when electricity finds a very low-resistance path and rushes too fast. That can overheat the circuit and cause a burst.\n\nTo prevent that, make sure your wiring is correct, avoid heavy loads on one battery, and use resistors where needed.`;
  }

  if(q.includes("led")){
    return `An LED is a light-emitting diode. It needs correct polarity and enough voltage to glow. In your simulator, an LED needs at least 2V and a complete path from battery + back to battery -.`;
  }

  if(q.includes("motor") || q.includes("pump") || q.includes("servo")){
    return `Motors, pumps, and servos are heavier loads than LEDs. They usually need more voltage and more current.\n\nThat means they are more likely to cause overload if too many are connected to one battery without protection.`;
  }

  if(q.includes("why") && q.includes("not") || q.includes("not turning on")){
    return `When a circuit does not turn on, check these four things:\n1. Is there a battery?\n2. Is the voltage high enough?\n3. Is there a full path from + to -?\n4. Did you run the logic so switches/relays close?\n\nYour current circuit status: ${activeNames.length ? `${activeNames.join(", ")} is active.` : "No output components are active right now."}`;
  }

  return `Here’s the teacher explanation:\n${getCircuitSummary()}\n\nYour question was: "${question}"\n\nThink of a circuit like a road for electric charge. For something to work, it needs:\n- a source of voltage\n- a connected path from + to -\n- enough voltage for the component\n- the control logic to allow the path\n\nAsk me about LEDs, motors, switches, resistors, voltage, short circuits, or your current circuit and I’ll explain it step by step.`;
}

function askAiTeacherPrompt(promptText){
  openAiTeacherPage();
  aiTeacherInput.value = promptText;
  sendAiTeacherMessage();
}

function sendAiTeacherMessage(){
  const question = aiTeacherInput.value.trim();
  if(!question) return;

  addAiTeacherMessage("student", question);
  aiTeacherInput.value = "";

  const reply = buildAiTeacherReply(question);
  setTimeout(() => {
    addAiTeacherMessage("teacher", reply);
  }, 280);
}

function openAiTeacherPage(){
  aiTeacherPage.classList.remove("hidden");
  updateAiTeacherContext();
  syncEducircuitPageView({ force: true });

  if(state.aiTeacherMessages.length === 0){
    addAiTeacherMessage(
      "teacher",
      "Hello! I’m your AI Teacher. I will check your circuit and reply with Status, Why, Fix, and Tip."
    );
  }

  setTimeout(() => aiTeacherInput.focus(), 50);
}

function closeAiTeacherPage(){
  aiTeacherPage.classList.add("hidden");
  syncEducircuitPageView({ force: true });
}

function isGradedProject(project = {}) {
  const grade = String(project.grade || "").trim();
  const status = String(project.status || "").toLowerCase();
  return status === "graded" || Boolean(grade && grade !== "Not graded");
}

  function renderProjectsPage(){
    const container = document.getElementById("projectsPageList");
    container.innerHTML = "";

    const school = state.user.school;

    if(!state.schools[school]) return;

    const student = state.schools[school].students.find(
      s => s.name === state.user.name
    );

    const savedProjects = (student?.projects || [])
      .map((proj, index) => ({ proj, index }))
      .filter(({ proj }) => !isGradedProject(proj));

    if(savedProjects.length === 0){
      container.innerHTML = "<p>No saved projects yet</p>";
      return;
  }

  savedProjects.forEach(({ proj, index }) => {
    container.appendChild(UI.projectPageCard(proj, index));
   });
 }

function renderProjectList(){
  const school = state.user.school;
  const container = document.getElementById("projectList");
  if(!container) return;

  const student = state.schools[school]?.students.find(
    s => s.name === state.user.name
  );

  const savedProjects = (student?.projects || [])
    .map((proj, index) => ({ proj, index }))
    .filter(({ proj }) => !isGradedProject(proj));

  if(savedProjects.length === 0){
    container.innerHTML = "<p class=\"project-card-meta\">No saved projects yet</p>";
    return;
  }

  container.innerHTML = "";
  savedProjects.forEach(({ proj, index }) => {
    container.appendChild(UI.projectListItem(proj, index));
  });
}

function renderStudentProjectsPage(){
  const container = document.getElementById("studentProjectsPageList");
  if(!container) return;

  const school = state.user.school;
  const schoolData = state.schools[school];
  if(!schoolData){
    container.innerHTML = "<p>No student projects yet</p>";
    return;
  }

  const studentsToShow = state.user.role === "teacher"
    ? schoolData.students
    : schoolData.students.filter(student => student.name === state.user.name);
  const gradedProjects = [];

  studentsToShow.forEach(student => {
    (student.projects || []).forEach((proj, index) => {
      if(proj.grade && proj.grade !== "Not graded"){
        gradedProjects.push({ student, proj, index });
      }
    });
  });

  if(gradedProjects.length === 0){
    container.innerHTML = state.user.role === "teacher"
      ? "<p>No graded student projects yet</p>"
      : "<p>No graded work yet</p>";
    return;
  }

  container.innerHTML = "";
  gradedProjects.forEach(({ student, proj, index }) => {
    container.appendChild(UI.studentProjectCard({
      student,
      project: proj,
      index,
      isTeacher: state.user.role === "teacher"
    }));
  });
}

function openStudentProject(studentName, index){
  const school = state.user.school;
  const student = state.schools[school]?.students.find(s => s.name === studentName);
  const proj = student?.projects[index];
  if(!proj) return;

  state.items = deepClone(proj.items);
  state.wires = deepClone(proj.wires);
  state.logic = deepClone(proj.logic);
  state.projectName = `${proj.name}`;
  state.currentProjectIndex = index;
  state.projectOwnerName = studentName;
  state.logicArmed = false;
  projectNameText.textContent = state.projectName;
  gradeText.textContent = proj.grade || "Not graded";
  statusText.textContent = proj.status || "Not Submitted";
  teacherSubmissionState.textContent = proj.status || "Pending";
  teacherGradeState.textContent = proj.grade || "Not graded";
  teacherGradeInput.value = proj.grade && proj.grade !== "Not graded" ? proj.grade : "";
  teacherCommentInput.value = proj.feedback || "";
  syncNextId();
  syncBatteryVoltageFromItems();
  refreshSimulation();
  renderItems();
  renderLogic();
  drawWires();
  closeStudentProjectsPage();
  showToast(`${studentName}'s project loaded 🚀`);
}

function addComponent(type, x = null, y = null){
  const cfg = getCatalog(type);
  if(!cfg) return;

  const item = {
    id: "item-" + state.nextId++,
    type,
    x: x ?? (120 + state.items.length * 26),
    y: y ?? (100 + state.items.length * 24),
    ports: cfg.ports.slice(),
    voltage: type === "Battery" ? state.defaultBatteryVoltage : undefined,
    isClosed: type === "Switch" || type === "Relay" ? false : undefined,
    ledOn: false,
    motorOn: false,
    buzzerOn: false
  };

  state.items.push(item);
  refreshSimulation();
  renderItems();
  updateTeacherStats();
  const name = translateText(type);
  showToast(name + (state.lang === "ta" ? " சேர்க்கப்பட்டது" : " added"));
}

function renderItems(){
  itemsLayer.innerHTML = "";

  state.items.forEach(item => {
    const cfg = getCatalog(item.type);
    const el = document.createElement("div");
    el.className = "canvas-item";
    if(state.burstItems.includes(item.id)){
      el.classList.add("bursting");
    }
    if(item.type === "Switch" || item.type === "Relay"){
      el.classList.add("switch-control-item", item.isClosed ? "switch-closed" : "switch-open");
    }
    el.dataset.id = item.id;
    el.style.left = item.x + "px";
    el.style.top = item.y + "px";

    const statusHtml = UI.canvasItemStatus({
      item,
      config: cfg,
      activeItemIds: state.activeItems,
      burstItemIds: state.burstItems
    });

    el.innerHTML = `
      <div class="item-head">
       <b>${cfg.icon} ${translateText(item.type)}</b>
        ${statusHtml}
      </div>
      <div class="item-body">${cfg.desc}${item.type === "Battery" ? `<span class="terminal-hint">${Number(item.voltage ?? state.defaultBatteryVoltage).toFixed(1)}V output</span>` : `<span class="terminal-hint">- left • + right</span>`}</div>
    `;

    if(item.type === "Switch" || item.type === "Relay"){
      const switchToggle = document.createElement("button");
      switchToggle.type = "button";
      switchToggle.className = "switch-toggle-control";
      switchToggle.textContent = item.isClosed ? "Turn OFF" : "Turn ON";
      switchToggle.setAttribute("aria-pressed", String(Boolean(item.isClosed)));
      switchToggle.addEventListener("mousedown", event => {
        event.preventDefault();
        event.stopPropagation();
      });
      switchToggle.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        toggleSwitchItem(item.id);
      });
      el.querySelector(".item-body")?.appendChild(switchToggle);
    }

    item.ports.forEach(pos => {
      const p = document.createElement("div");
      p.className = "port " + pos;
      p.dataset.itemId = item.id;
      p.dataset.port = pos;
      p.title = "Connect wire";
      
      let dragged = false;

       p.addEventListener("mousedown", (ev) => {
         dragged = false;
         startWireDrag(item.id, pos, ev);
       });

       p.addEventListener("mousemove", (e) => {
         if(Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2){
           dragged = true;
         }
       });

       p.addEventListener("click", (ev) => {
         if(dragged) return; // 🔥 prevents double trigger
         ev.stopPropagation();
         handlePortClick(item.id, pos);
       });
      el.appendChild(p);

      if(pos === "positive" || pos === "negative"){
        const label = document.createElement("span");
        label.className = `port-label ${pos}`;
        label.textContent = pos === "positive" ? "+" : "-";
        el.appendChild(label);
      }
    });

    el.addEventListener("mousedown", startDragItem);
    itemsLayer.appendChild(el);
  });

  drawWires();
  syncOutputsToCanvas();
  window.EducircuitUpgrade?.afterRenderItems?.();
}


function loadSavedProject(index){
  const school = state.user.school;

  const student = state.schools[school].students.find(
    s => s.name === state.user.name
  );

  const proj = student.projects[index];

  // 🔥 Load into current workspace
  state.items = deepClone(proj.items);
  state.wires = deepClone(proj.wires);
  state.logic = deepClone(proj.logic);
  state.projectName = proj.name;
  state.currentProjectIndex = index;
  state.projectOwnerName = state.user.name;
  state.logicArmed = false;
  projectNameText.textContent = state.projectName;
  gradeText.textContent = proj.grade || "Not graded";
  statusText.textContent = proj.status || "Not Submitted";
  teacherSubmissionState.textContent = proj.status || "Pending";
  teacherGradeState.textContent = proj.grade || "Not graded";
  teacherGradeInput.value = proj.grade && proj.grade !== "Not graded" ? proj.grade : "";
  teacherCommentInput.value = proj.feedback || "";
  syncNextId();
  syncBatteryVoltageFromItems();
  refreshSimulation();

  // 🔥 Re-render UI
  renderItems();
  renderLogic();
  drawWires();
  closeProjectsPage();

  showToast("Project loaded 🚀");
}

function deleteProject(index){
  const school = state.user.school;

  const student = state.schools[school].students.find(
    s => s.name === state.user.name
  );   

  // ❌ Remove project
  student.projects.splice(index, 1);

  if(state.currentProjectIndex === index){
    state.currentProjectIndex = null;
  } else if(state.currentProjectIndex !== null && state.currentProjectIndex > index){
    state.currentProjectIndex -= 1;
  }

  // 🔄 Refresh UI
  renderProjectsPage();   // full page  

  showToast("Project deleted ❌");
}

function startDragItem(e){
  e.preventDefault();
  document.body.style.userSelect = "none";
  const target = e.currentTarget;
  const id = target.dataset.id;
  const item = state.items.find(i => i.id === id);
  if(!item) return;

  const rect = target.getBoundingClientRect();
  const worldRect = workspaceArea.getBoundingClientRect();

  // ✅ correct offset (NO JUMP)
  const offsetX = (e.clientX - rect.left) / state.zoom;
  const offsetY = (e.clientY - rect.top) / state.zoom;

  state.drag = { id, offsetX, offsetY };

  target.classList.add("dragging");

  function onMove(ev){
const x = (ev.clientX - worldRect.left) / state.zoom - offsetX;
const y = (ev.clientY - worldRect.top) / state.zoom - offsetY;

item.x = x;
item.y = y;

target.style.left = x + "px";
target.style.top = y + "px";

// ✅ BIN DETECTION (RESTORED)
const bin = deleteBin.getBoundingClientRect();

if(
  ev.clientX > bin.left &&
  ev.clientX < bin.right &&
  ev.clientY > bin.top &&
  ev.clientY < bin.bottom
){
  deleteBin.classList.add("active");
} else {
  deleteBin.classList.remove("active");
}

scheduleWireDraw();
  }

  function onUp(ev){
const bin = deleteBin.getBoundingClientRect();

// ✅ DELETE LOGIC (RESTORED)
if(
  ev.clientX > bin.left &&
  ev.clientX < bin.right &&
  ev.clientY > bin.top &&
  ev.clientY < bin.bottom
){
  state.items = state.items.filter(i => i.id !== id);
  state.wires = state.wires.filter(w =>
    w.from.itemId !== id && w.to.itemId !== id
  );
  showToast("Deleted 🗑️");
}

deleteBin.classList.remove("active");

target.classList.remove("dragging");
window.removeEventListener("mousemove", onMove);
window.removeEventListener("mouseup", onUp);

state.drag = null;
document.body.style.userSelect = "";

refreshSimulation();
renderItems();
drawWires();
  }

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function handlePortClick(itemId, port){
  if(!state.selectedPort){
    state.selectedPort = { itemId, port };
    showToast("First port selected");
    return;
  }

  const same = state.selectedPort.itemId === itemId && state.selectedPort.port === port;
  if(same){
    state.selectedPort = null;
    showToast("Selection cancelled");
    return;
  }

  state.wires.push({
    id: "wire-" + Date.now() + "-" + Math.random().toString(16).slice(2),
    from: { ...state.selectedPort },
    to: { itemId, port }
  });

  state.selectedPort = null;
  scheduleWireDraw();
  refreshSimulation();
  updateTeacherStats();
  showToast("Wire connected");
}

function getItemById(id){
  return state.items.find(i => i.id === id);
}

function toggleSwitchItem(id){
  const item = getItemById(id);
  if(!item || (item.type !== "Switch" && item.type !== "Relay")) return;

  item.isClosed = !item.isClosed;
  state.logicArmed = true;
  const simulation = refreshSimulation();

  if(simulation.overload && simulation.message){
    showToast(simulation.message);
    return;
  }

  showToast(`${item.type} ${item.isClosed ? "closed" : "opened"}`);
}

function getPortPosition(itemId, port){
  const portEl = itemsLayer.querySelector(`.canvas-item[data-id="${itemId}"] .port[data-port="${port}"]`);
  if(portEl){
    const portRect = portEl.getBoundingClientRect();
    const worldRect = workspaceArea.getBoundingClientRect();
    return {
      x: (portRect.left + portRect.width / 2 - worldRect.left) / state.zoom,
      y: (portRect.top + portRect.height / 2 - worldRect.top) / state.zoom
    };
  }

  const item = getItemById(itemId);
  if(!item) return { x:0, y:0 };
  return { x:item.x, y:item.y };
}

function getItemBounds(itemId){
  const itemEl = itemsLayer.querySelector(`.canvas-item[data-id="${itemId}"]`);
  if(itemEl){
    const rect = itemEl.getBoundingClientRect();
    const worldRect = workspaceArea.getBoundingClientRect();
    return {
      left: (rect.left - worldRect.left) / state.zoom,
      right: (rect.right - worldRect.left) / state.zoom,
      top: (rect.top - worldRect.top) / state.zoom,
      bottom: (rect.bottom - worldRect.top) / state.zoom
    };
  }

  const item = getItemById(itemId);
  if(!item) return { left:0, right:0, top:0, bottom:0 };

  return {
    left: item.x,
    right: item.x + 120,
    top: item.y,
    bottom: item.y + 84
  };
}

function getWorkspaceWorldSize(){
  return {
    width: workspaceArea.clientWidth / state.zoom,
    height: workspaceArea.clientHeight / state.zoom
  };
}

function clampValue(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function keepItemsInsideWorkspace(){
  if(!state.items.length) return;

  const cardWidth = 120;
  const cardHeight = 92;
  const padding = 24;
  const workspace = getWorkspaceWorldSize();
  if(!workspace.width || !workspace.height) return;

  let minX = Math.min(...state.items.map(item => item.x));
  let maxX = Math.max(...state.items.map(item => item.x + cardWidth));
  let minY = Math.min(...state.items.map(item => item.y));
  let maxY = Math.max(...state.items.map(item => item.y + cardHeight));

  const availableWidth = Math.max(120, workspace.width - padding * 2);
  const availableHeight = Math.max(120, workspace.height - 190);
  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);

  const scaleX = contentWidth > availableWidth ? availableWidth / contentWidth : 1;
  const scaleY = contentHeight > availableHeight ? availableHeight / contentHeight : 1;
  const scale = Math.min(scaleX, scaleY);

  if(scale < 1){
    state.items.forEach(item => {
      item.x = padding + (item.x - minX) * scale;
      item.y = padding + (item.y - minY) * scale;
    });
  }

  state.items.forEach(item => {
    item.x = clampValue(item.x, padding, Math.max(padding, workspace.width - cardWidth - padding));
    item.y = clampValue(item.y, padding, Math.max(padding, workspace.height - cardHeight - 170));
  });
}

function getPortDirection(port){
  if(port === "left" || port === "negative") return -1;
  if(port === "right" || port === "positive") return 1;
  return 0;
}

function buildWirePath(a, b, fromPort, toPort, fromItemId, toItemId){
  const dirA = getPortDirection(fromPort) || 1;
  const dirB = getPortDirection(toPort) || -1;
  const lead = 12;
  const pad = 12;
  const leadA = { x: a.x + dirA * lead, y: a.y };
  const leadB = { x: b.x - dirB * lead, y: b.y };
  const fromBounds = getItemBounds(fromItemId);
  const toBounds = getItemBounds(toItemId);
  const workspace = getWorkspaceWorldSize();
  const sameRow = Math.abs(a.y - b.y) < 26;
  const enoughHorizontalSpace = (dirA === 1 && leadA.x <= leadB.x) || (dirA === -1 && leadA.x >= leadB.x);

  if(sameRow && enoughHorizontalSpace){
    return [
      `M ${a.x} ${a.y}`,
      `L ${leadA.x} ${leadA.y}`,
      `L ${leadB.x} ${leadB.y}`,
      `L ${b.x} ${b.y}`
    ].join(" ");
  }

  const topLane = clampValue(Math.min(fromBounds.top, toBounds.top) - pad, 18, Math.max(18, workspace.height - 18));
  const bottomLane = clampValue(Math.max(fromBounds.bottom, toBounds.bottom) + pad, 18, Math.max(18, workspace.height - 18));
  const laneY = a.y <= b.y ? topLane : bottomLane;

  return [
    `M ${a.x} ${a.y}`,
    `L ${leadA.x} ${leadA.y}`,
    `L ${leadA.x} ${laneY}`,
    `L ${leadB.x} ${laneY}`,
    `L ${leadB.x} ${leadB.y}`,
    `L ${b.x} ${b.y}`
  ].join(" ");
}

function drawWires(){
  wireLayer.innerHTML = "";

  // NORMAL WIRES
  state.wires.forEach(wire => {
const a = getPortPosition(wire.from.itemId, wire.from.port);
const b = getPortPosition(wire.to.itemId, wire.to.port);
const isPositiveWire = wire.from.port === "positive" && wire.to.port === "positive";
const isNegativeWire = wire.from.port === "negative" && wire.to.port === "negative";
const stroke = isPositiveWire
  ? "#ef4444"
  : (isNegativeWire ? "#2563eb" : "#64748b");
const pulseFill = isPositiveWire
  ? "#f87171"
  : (isNegativeWire ? "#60a5fa" : "#94a3b8");
const pathData = buildWirePath(
  a,
  b,
  wire.from.port,
  wire.to.port,
  wire.from.itemId,
  wire.to.itemId
);

const glowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
glowPath.setAttribute("d", pathData);
glowPath.setAttribute("fill", "none");
glowPath.setAttribute("stroke", stroke);
glowPath.setAttribute("stroke-width", "8");
glowPath.setAttribute("stroke-linecap", "round");
glowPath.setAttribute("stroke-linejoin", "round");
glowPath.setAttribute("opacity", "0.12");
wireLayer.appendChild(glowPath);

const shadowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
shadowPath.setAttribute("d", pathData);
shadowPath.setAttribute("fill", "none");
shadowPath.setAttribute("stroke", "#ffffff");
shadowPath.setAttribute("stroke-width", "6");
shadowPath.setAttribute("stroke-linecap", "round");
shadowPath.setAttribute("stroke-linejoin", "round");
shadowPath.setAttribute("opacity", "0.55");
wireLayer.appendChild(shadowPath);

const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.dataset.id = wire.id;
path.style.cursor = "pointer";
path.setAttribute("d", pathData);
path.setAttribute("fill", "none");
path.setAttribute("stroke", stroke);
path.setAttribute("stroke-width", "3.5");
path.setAttribute("stroke-linecap", "round");
path.setAttribute("stroke-linejoin", "round");
path.setAttribute("opacity", "1");
path.addEventListener("click", () => {
  state.wires = state.wires.filter(w => w.id !== wire.id);
  drawWires();
  refreshSimulation();
  updateTeacherStats();
  showToast("Wire deleted ❌");
});


path.addEventListener("mouseenter", () => {
  path.setAttribute("stroke", "#f59e0b");
  path.setAttribute("stroke-width", "4.5");
  glowPath.setAttribute("opacity", "0.2");
});

path.addEventListener("mouseleave", () => {
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "3.5");
  glowPath.setAttribute("opacity", "0.12");
});  

wireLayer.appendChild(path);

const startCap = document.createElementNS("http://www.w3.org/2000/svg", "circle");
startCap.setAttribute("cx", a.x);
startCap.setAttribute("cy", a.y);
startCap.setAttribute("r", "2.8");
startCap.setAttribute("fill", stroke);
startCap.setAttribute("opacity", "0.95");
wireLayer.appendChild(startCap);

const endCap = document.createElementNS("http://www.w3.org/2000/svg", "circle");
endCap.setAttribute("cx", b.x);
endCap.setAttribute("cy", b.y);
endCap.setAttribute("r", "2.8");
endCap.setAttribute("fill", stroke);
endCap.setAttribute("opacity", "0.95");
wireLayer.appendChild(endCap);

const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
pulse.setAttribute("r", "3.5");
pulse.setAttribute("fill", pulseFill);
pulse.innerHTML = `<animateMotion dur="2s" repeatCount="indefinite"
  path="${pathData}" />`;
wireLayer.appendChild(pulse);
  });

  // 🔥 DRAG PREVIEW (FIXED)
  if(state.wireDrag){
const a = getPortPosition(
  state.wireDrag.from.itemId,
  state.wireDrag.from.port
);

const rect = workspaceArea.getBoundingClientRect();

const b = {
  x: (state.wireDrag.x - rect.left) / state.zoom,
  y: (state.wireDrag.y - rect.top) / state.zoom
};
const dirA = getPortDirection(state.wireDrag.from.port) || 1;
const lead = 12;
const laneY = a.y <= b.y ? Math.min(a.y, b.y) - 12 : Math.max(a.y, b.y) + 12;
const leadA = { x: a.x + dirA * lead, y: a.y };
const leadB = { x: b.x + (b.x >= a.x ? -lead : lead), y: b.y };
const previewPath = [
  `M ${a.x} ${a.y}`,
  `L ${leadA.x} ${leadA.y}`,
  `L ${leadA.x} ${laneY}`,
  `L ${leadB.x} ${laneY}`,
  `L ${leadB.x} ${leadB.y}`,
  `L ${b.x} ${b.y}`
].join(" ");

const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

path.setAttribute("d", previewPath);

path.setAttribute("fill", "none");
path.setAttribute("stroke", "#94a3b8");
path.setAttribute("stroke-width", "3");
path.setAttribute("stroke-dasharray", "6,6");
path.setAttribute("stroke-linecap", "round");
path.setAttribute("stroke-linejoin", "round");

wireLayer.appendChild(path);
  }
}
   
const scheduleWireDraw = performanceTools.rafThrottle
  ? performanceTools.rafThrottle(() => drawWires())
  : () => drawWires();


function addLogic(name){
  state.logic.push(name);
  renderLogic();
  updateTeacherStats();
  const label = translateText(name);
  showToast(label + (state.lang === "ta" ? " சேர்க்கப்பட்டது" : " added"));
}

function renderLogic(){
  logicList.innerHTML = "";

  state.logic.forEach((step, index) => {
    const chip = document.createElement("div");
    chip.className = "logic-chip";

    const label = translateText(step);

    chip.innerHTML = `<span>${index + 1}. ${label}</span>`;

    const remove = document.createElement("button");
    remove.textContent = "×";

    remove.addEventListener("click", () => {
      state.logic.splice(index, 1);
      renderLogic();
      updateTeacherStats();
    });

    chip.appendChild(remove);
    logicList.appendChild(chip);
  });
  syncWorkspaceDockLayout();
} 

function setMode(mode){
  state.user.role = mode;

  const isStudent = mode === "student";

  studentPanel.classList.toggle("hidden", !isStudent);
  teacherPanel.classList.toggle("hidden", isStudent);

  activeUserPill.textContent = `${state.user.name || "Demo User"} • ${mode}`;

  if(mode === "teacher"){
    renderStudentProjectsPage();
  }
  window.EducircuitUpgrade?.onModeChange?.(mode);
}

function updateOutputs(){
  dashboardLed.classList.toggle("on", state.outputs.led);
  dashboardMotor.classList.toggle("on", state.outputs.motor);
  dashboardBuzzer.classList.toggle("on", state.outputs.buzzer);
  ledStateText.textContent = state.outputs.overload ? "BURST 💥" : (state.outputs.led ? "ON" : "OFF");
  motorStateText.textContent = state.outputs.overload ? "BURST 💥" : (state.outputs.motor ? "ON" : "OFF");
  buzzerStateText.textContent = state.outputs.overload ? "BURST 💥" : (state.outputs.buzzer ? "ON" : "OFF");
  coachStatusText.textContent = state.coach.status;
  coachHintText.textContent = state.coach.hint;
  coachFixText.textContent = state.coach.fix;
  renderItems();
  window.EducircuitUpgrade?.afterUpdateOutputs?.();
}

function syncOutputsToCanvas(){
  const cards = itemsLayer.querySelectorAll(".canvas-item");
  cards.forEach(card => {
    const id = card.dataset.id;
    const item = getItemById(id);
    if(!item) return;
  });
}
 function startWireDrag(itemId, port, event){
  event.preventDefault();
  event.stopPropagation();
  document.body.style.userSelect = "none";

  state.wireDrag = {
from: { itemId, port },
x: event.clientX,
y: event.clientY
  };

  window.addEventListener("mousemove", onWireMove);
  window.addEventListener("mouseup", endWireDrag);
}

function onWireMove(e){
  if(!state.wireDrag) return;

  state.wireDrag.x = e.clientX;
  state.wireDrag.y = e.clientY;

  scheduleWireDraw();
}

function endWireDrag(e){
  if(!state.wireDrag) return;

  const target = document.elementFromPoint(e.clientX, e.clientY);

  if(target && target.classList.contains("port")){
const toItemId = target.dataset.itemId;
const toPort = target.dataset.port;

if(!(state.wireDrag.from.itemId === toItemId && state.wireDrag.from.port === toPort)){
  state.wires.push({
    id: "wire-" + Date.now() + "-" + Math.random().toString(16).slice(2),
    from: state.wireDrag.from,
    to: { itemId: toItemId, port: toPort }
  });

  showToast("Wire connected ⚡");
}
  }

  state.wireDrag = null;

  window.removeEventListener("mousemove", onWireMove);
  window.removeEventListener("mouseup", endWireDrag);

  drawWires();
  refreshSimulation();
  updateTeacherStats();
  document.body.style.userSelect = "";
}

async function runLogic(){
  const usesControlLogic = state.logic.some(step => step === "ON" || step === "OFF");
  let initialSimulation = null;
  if(usesControlLogic){
    resetOutputs(false);
  } else {
    state.logicArmed = true;
    initialSimulation = refreshSimulation();
    if(initialSimulation.overload){
      showToast(initialSimulation.message);
      return;
    }
  }

  let executedNormally = true;

  for(const step of state.logic){

    if(step === "ON"){
      state.logicArmed = true;
      state.items.forEach(item => {
        if(item.type === "Switch" || item.type === "Relay"){
          item.isClosed = true;
        }
      });
      const simulation = refreshSimulation();

      if(simulation.overload){
        showToast(simulation.message);
        executedNormally = false;
        break;
      }
    }

    else if(step === "OFF"){
      state.logicArmed = false;
      state.items.forEach(item => {
        if(item.type === "Switch" || item.type === "Relay"){
          item.isClosed = false;
        }
      });
      state.outputs.led = false;
      state.outputs.motor = false;
      state.outputs.buzzer = false;
      state.outputs.overload = false;
      state.activeItems = [];
      state.burstItems = [];
    }

    else if(step === "WAIT 1s"){
      updateOutputs();
      await wait(1000);
    }

    updateOutputs();
    await wait(250);
  }

  if(executedNormally){
    showToast("Logic executed ⚡");
  }
}

function resetOutputs(showMessage = true){
  state.logicArmed = false;
  state.items.forEach(item => {
    if(item.type === "Switch" || item.type === "Relay"){
      item.isClosed = false;
    }
  });
  state.outputs.led = false;
  state.outputs.motor = false;
  state.outputs.buzzer = false;
  state.outputs.overload = false;
  state.activeItems = [];
  state.burstItems = [];
  updateOutputs();
  if(showMessage) showToast("Outputs reset");
}

function wait(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function syncWorkspaceDockLayout(){
  if(!workspaceArea || !logicDock) return;
  const dockHeight = Math.ceil(logicDock.getBoundingClientRect().height);
  workspaceArea.style.setProperty("--logic-dock-height", `${Math.max(dockHeight, 120)}px`);
}

function updateZoom(){
  canvasWorld.style.transform = `scale(${state.zoom})`;
  zoomDisplay.textContent = Math.round(state.zoom * 100) + "%";
  drawWires();
}

function updateTeacherStats(){
  teacherComponentCount.textContent = String(state.items.length);
  teacherWireCount.textContent = String(state.wires.length);
  teacherLogicCount.textContent = String(state.logic.length);
}

function autoWire(){
  state.wires = [];
  const battery = state.items.find(item => item.type === "Battery");
  const loads = state.items.filter(item => item.type !== "Battery");

  if(battery && loads.length){
    const first = loads[0];

    state.wires.push({
      id: "wire-auto-start",
      from: { itemId: battery.id, port: "positive" },
      to: { itemId: first.id, port: "positive" }
    });

    for(let i = 0; i < loads.length - 1; i++){
      const current = loads[i];
      const next = loads[i + 1];

      state.wires.push({
        id: "wire-auto-chain-" + i,
        from: { itemId: current.id, port: "negative" },
        to: { itemId: next.id, port: "positive" }
      });
    }

    const last = loads[loads.length - 1];

    state.wires.push({
      id: "wire-auto-return",
      from: { itemId: last.id, port: "negative" },
      to: { itemId: battery.id, port: "negative" }
    });
  } else if(state.items.length >= 2) {
    for(let i = 0; i < state.items.length - 1; i++){
      const a = state.items[i];
      const b = state.items[i + 1];
      state.wires.push({
        id: "wire-auto-" + i,
        from: { itemId:a.id, port:"negative" },
        to: { itemId:b.id, port:"positive" }
      });
    }
  }
  drawWires();
  refreshSimulation();
  updateTeacherStats();
  showToast("Auto wire completed");
}

function clearProject(){
  state.items = [];
  state.wires = [];
  state.logic = [];
  state.selectedPort = null;
  state.currentProjectIndex = null;
  state.projectOwnerName = state.user.name;
  resetOutputs(false);
  syncBatteryVoltageControls();
  refreshSimulation();
  renderItems();
  renderLogic();
  updateTeacherStats();
  showToast("Canvas cleared");
}

function submitProject(){
  const school = state.user.school;
  const ownerName = state.projectOwnerName || state.user.name;
  let student = state.schools[school]?.students.find(s => s.name === ownerName);

  if(student && (state.currentProjectIndex === null || !student.projects[state.currentProjectIndex])){
    saveProject({ silent: true });
    student = state.schools[school]?.students.find(s => s.name === ownerName);
  }

  statusText.textContent = "Submitted";
  teacherSubmissionState.textContent = "Submitted";
  if(student && state.currentProjectIndex !== null && student.projects[state.currentProjectIndex]){
    student.projects[state.currentProjectIndex].status = "Submitted";
    renderProjectList();
    renderProjectsPage();
  }
  showToast("Project submitted");
}

function applyGrade(){
  const value = teacherGradeInput.value.trim();
  const feedback = teacherCommentInput.value.trim();
  if(!value){
    showToast("Enter a grade first");
    return;
  }
  gradeText.textContent = value;
  statusText.textContent = "Graded";
  teacherSubmissionState.textContent = "Graded";
  teacherGradeState.textContent = value;
  const school = state.user.school;
  const ownerName = state.projectOwnerName || state.user.name;
  const student = state.schools[school]?.students.find(s => s.name === ownerName);
  if(student && state.currentProjectIndex !== null && student.projects[state.currentProjectIndex]){
    const visibility = document.getElementById("projectVisibilitySelect")?.value ||
      student.projects[state.currentProjectIndex].visibility ||
      "public";
    student.projects[state.currentProjectIndex].grade = value;
    student.projects[state.currentProjectIndex].feedback = feedback;
    student.projects[state.currentProjectIndex].status = "Graded";
    student.projects[state.currentProjectIndex].visibility = visibility;
    student.projects[state.currentProjectIndex].cloneable = visibility === "public";
    student.projects[state.currentProjectIndex].gradedAt = new Date().toLocaleString();
    renderProjectList();
    renderProjectsPage();
    renderStudentProjectsPage();
  }
  showToast("Grade applied");
}

function renameProject(){
  projectRenameInput.value = state.projectName;
  projectRenameInput.classList.remove("error");
  projectRenameModal.classList.remove("hidden");
  projectRenameModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setTimeout(() => {
    projectRenameInput.focus();
    projectRenameInput.select();
  }, 40);
}

function closeProjectRenameModal(){
  projectRenameModal.classList.add("hidden");
  projectRenameModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  document.getElementById("renameBtn")?.focus();
}

function saveProjectName(event){
  event.preventDefault();
  const nextName = projectRenameInput.value.trim();
  if(!nextName){
    projectRenameInput.classList.add("error");
    projectRenameInput.focus();
    showToast("Enter a project name");
    return;
  }

  state.projectName = nextName;
  projectNameText.textContent = state.projectName;
  closeProjectRenameModal();
  showToast("Project renamed");
}

function copyProjectSummary(){
  const text = [
    "Project: " + state.projectName,
    "User: " + (state.user.name || "Demo User"),
    "Role: " + state.user.role,
    "Components: " + state.items.length,
    "Wires: " + state.wires.length,
    "Logic Blocks: " + state.logic.length,
    "Grade: " + gradeText.textContent,
    "Status: " + statusText.textContent
  ].join("\n");

  navigator.clipboard.writeText(text).then(() => {
    showToast("Project summary copied");
  }).catch(() => {
    showToast("Copy failed");
  });
}

// 🔥 LANDING CONTROL
function enterLanding(){
  const dontShow = document.getElementById("dontShowLanding").checked;

  if(dontShow){
    window.EducircuitRuntimePrefs.hideLanding = true;
  }

  document.getElementById("landingPage").classList.add("hidden");
  if(state.user.uid || state.demoMode){
    loginScreen.classList.add("hidden");
    syncEducircuitPageView({ force: true });
    return;
  }
  showLoginChooser();
}

// 📘 GUIDE CONTROL
function openGuide(){
  document.getElementById("guidePage").classList.remove("hidden");
  syncEducircuitPageView({ force: true });
}

function closeGuide(){
  document.getElementById("guidePage").classList.add("hidden");
  syncEducircuitPageView({ force: true });
}

// 🔥 AUTO HIDE LANDING DURING THIS RUNTIME ONLY
if(window.EducircuitRuntimePrefs.hideLanding === true){
  document.getElementById("landingPage").classList.add("hidden");
}

function saveProject(options = {}){
  const { silent = false } = options;
  const school = state.user.school;
  const ownerName = state.projectOwnerName || state.user.name;

  const student = state.schools[school].students.find(
    s => s.name === ownerName
  );

  if(student){
    const existingProject = state.currentProjectIndex !== null
      ? student.projects[state.currentProjectIndex]
      : null;
    const visibility = document.getElementById("projectVisibilitySelect")?.value ||
      existingProject?.visibility ||
      "public";
    const projectRecord = {
      name: state.projectName,
      items: deepClone(state.items),
      wires: deepClone(state.wires),
      logic: deepClone(state.logic),
      date: new Date().toLocaleString(),
      grade: gradeText.textContent || existingProject?.grade || "Not graded",
      status: statusText.textContent || existingProject?.status || "Not Submitted",
      feedback: teacherCommentInput.value.trim() || existingProject?.feedback || "",
      visibility,
      cloneable: visibility === "public"
    };

    if(state.currentProjectIndex !== null && student.projects[state.currentProjectIndex]){
      student.projects[state.currentProjectIndex] = projectRecord;
    } else {
      student.projects.push(projectRecord);
      state.currentProjectIndex = student.projects.length - 1;
    }
  }

  renderProjectList();
  renderProjectsPage();
  renderStudentProjectsPage();

  if(!silent){
    showToast("Project saved");
  }
}

async function saveProjectToFirebase() {
  try {
    if(!auth.currentUser || !state.user.schoolKey){
      showToast("Log in to save projects to Firebase");
      return;
    }

    const schoolId = state.user.schoolKey || getSchoolDocId(state.user.school);
    const projectRef = await db.collection("schools").doc(schoolId).collection("projects").add({
      schoolId,
      ownerId: auth.currentUser.uid,
      ownerName: state.user.name,
      ownerRole: state.user.role,
      className: state.user.className || "",
      name: state.projectName,
      items: JSON.parse(JSON.stringify(state.items)),
      wires: JSON.parse(JSON.stringify(state.wires)),
      logic: JSON.parse(JSON.stringify(state.logic)),
      defaultBatteryVoltage: Number(state.defaultBatteryVoltage || 5),
      status: statusText.textContent || "DRAFT",
      visibility: document.getElementById("projectVisibilitySelect")?.value || "public",
      grade: gradeText.textContent || "Not graded",
      feedback: teacherCommentInput.value.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    state.remoteProjectId = projectRef.id;
    showToast("Project saved");

  } catch (err) {
console.error(err);
showToast("Error saving project");
  }
}

function loadProject(){
  auth.onAuthStateChanged(async (firebaseUser) => {
    if(firebaseUser){
      try{
        const profile = await fetchUserProfile(firebaseUser.uid);
        if(profile){
          applyAuthenticatedProfile(firebaseUser.uid, profile);
        } else {
          resetAuthenticatedUser();
        }
      } catch(error){
        console.error(error);
        resetAuthenticatedUser();
      }
    } else if(!state.demoMode){
      resetAuthenticatedUser();
    }
  });
}

function buildDemoProfile(role){
  const isTeacher = role === "teacher";
  return {
    uid: `demo-${isTeacher ? "teacher" : "student"}`,
    name: isTeacher ? "Demo Teacher" : "Demo Student",
    email: isTeacher ? "teacher@demo.educircuitlabs.app" : "student@demo.educircuitlabs.app",
    role: isTeacher ? "teacher" : "student",
    className: isTeacher ? "Robotics Lab" : "10-A",
    school: "STEM Academy",
    schoolKey: "stem-academy",
    schoolId: "stem-academy",
    schoolUsername: "stem-academy"
  };
}

function fillDemo(role){
  const profile = buildDemoProfile(role);
  loginName.value = profile.name;
  loginEmail.value = profile.email;
  loginRole.value = profile.role;
  loginClass.value = profile.className;
  loginSchool.value = profile.school;
  loginSchoolUser.value = profile.schoolUsername;
  loginSchoolPass.value = "School@123";
  applyAuthenticatedProfile(profile.uid, profile, { demo: true });
  syncRoleFields();
  showToast(`${profile.name} loaded in demo mode`);
}

function enterPlatform(){
  if(loginCard?.dataset.step === "1"){
    openAuthMode(getAuthMode());
    return;
  }
  if(getAuthMode() === "create"){
    signUpUser();
    return;
  }
  loginUser();
}

function openProjectsPage(){
  document.getElementById("projectsPage").classList.remove("hidden");
  renderProjectsPage();
  syncEducircuitPageView({ force: true });
}

function closeProjectsPage(){
  document.getElementById("projectsPage").classList.add("hidden");
  syncEducircuitPageView({ force: true });
}

function openStudentProjectsPage(){
  document.getElementById("studentProjectsPage").classList.remove("hidden");
  renderStudentProjectsPage();
  syncEducircuitPageView({ force: true });
}

function closeStudentProjectsPage(){
  document.getElementById("studentProjectsPage").classList.add("hidden");
  syncEducircuitPageView({ force: true });
}

function installDelegatedUiActions(){
  document.addEventListener("click", (event) => {
    const promptButton = event.target.closest("[data-ai-prompt]");
    if(promptButton){
      askAiTeacherPrompt(promptButton.dataset.aiPrompt);
      return;
    }

    const projectButton = event.target.closest("[data-project-action]");
    if(projectButton){
      const index = Number(projectButton.dataset.projectIndex);
      if(projectButton.dataset.projectAction === "open"){
        loadSavedProject(index);
      } else if(projectButton.dataset.projectAction === "delete"){
        deleteProject(index);
      }
      return;
    }

    const studentProjectButton = event.target.closest("[data-student-project-action]");
    if(studentProjectButton?.dataset.studentProjectAction === "open"){
      openStudentProject(studentProjectButton.dataset.studentName, Number(studentProjectButton.dataset.projectIndex));
      return;
    }

    const actionButton = event.target.closest("[data-ui-action]");
    if(!actionButton) return;

    const actions = {
      "open-guide": openGuide,
      "close-guide": closeGuide,
      "enter-landing": enterLanding,
      "open-projects": openProjectsPage,
      "close-projects": closeProjectsPage,
      "open-student-projects": openStudentProjectsPage,
      "close-student-projects": closeStudentProjectsPage,
      "close-ai-teacher": closeAiTeacherPage
    };

    actions[actionButton.dataset.uiAction]?.();
  });
}

function loadExample(name){
  clearProject();

  if(name === "fan"){
    addComponent("Battery", 100, 120);
    addComponent("Switch", 280, 120);
    addComponent("Motor", 470, 120);
    autoWire();
    addLogic("ON");
  } else if(name === "alarm"){
    addComponent("Battery", 110, 140);
    addComponent("Switch", 300, 140);
    addComponent("Buzzer", 500, 140);
    autoWire();
    addLogic("ON");
  } else if(name === "traffic"){
    addComponent("Battery", 120, 110);
    addComponent("LED", 320, 110);
    addComponent("LED", 500, 110);
    addComponent("LED", 680, 110);
    autoWire();
    addLogic("ON");
    addLogic("WAIT 1s");
    addLogic("OFF");
  } else if(name === "plant"){
    addComponent("Battery", 80, 150);
    addComponent("Soil Sensor", 250, 150);
    addComponent("Relay", 430, 150);
    addComponent("Pump", 620, 150);
    autoWire();
    addLogic("ON");
  } else if(name === "lamp"){
    addComponent("Battery", 150, 170);
    addComponent("Switch", 360, 170);
    addComponent("LED", 560, 170);
    autoWire();
    addLogic("ON");
  }

  keepItemsInsideWorkspace();
  renderItems();
  drawWires();

  showToast("Example loaded");
}

document.getElementById("runLogicBtn").addEventListener("click", runLogic);
document.getElementById("stopLogicBtn").addEventListener("click", () => resetOutputs(true));
document.getElementById("autoWireBtn").addEventListener("click", autoWire);
document.getElementById("toggleGridBtn").addEventListener("click", () => {
  state.gridVisible = !state.gridVisible;
  workspaceArea.classList.toggle("grid-hidden", !state.gridVisible);
  showToast(state.gridVisible ? "Grid enabled" : "Grid hidden");
});

document.getElementById("zoomInBtn").addEventListener("click", () => {
  state.zoom = Math.min(2, +(state.zoom + 0.1).toFixed(2));
  updateZoom();
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
  state.zoom = Math.max(0.5, +(state.zoom - 0.1).toFixed(2));
  updateZoom();
});

document.getElementById("saveBtn").addEventListener("click", () => {
  saveProject({ silent: true });
  saveProjectToFirebase();
});
document.getElementById("aiTeacherBtn").addEventListener("click", openAiTeacherPage);
document.getElementById("clearBtn").addEventListener("click", clearProject);
document.getElementById("submitBtn").addEventListener("click", submitProject);
document.getElementById("applyGradeBtn").addEventListener("click", applyGrade);
document.getElementById("renameBtn").addEventListener("click", renameProject);
projectRenameForm?.addEventListener("submit", saveProjectName);
projectRenameCloseBtn?.addEventListener("click", closeProjectRenameModal);
projectRenameCancelBtn?.addEventListener("click", closeProjectRenameModal);
projectRenameModal?.addEventListener("click", event => {
  if(event.target === projectRenameModal){
    closeProjectRenameModal();
  }
});
document.addEventListener("keydown", event => {
  if(event.key === "Escape" && !projectRenameModal?.classList.contains("hidden")){
    closeProjectRenameModal();
  }
});
document.getElementById("copyProjectBtn").addEventListener("click", copyProjectSummary);
document.getElementById("clearLogicBtn").addEventListener("click", () => {
  state.logic = [];
  renderLogic();
  updateTeacherStats();
  showToast("Logic cleared");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  logoutUser();
});

document.getElementById("addWaitBtn").addEventListener("click", () => addLogic("WAIT 1s"));
document.getElementById("addLedOnBtn").addEventListener("click", () => addLogic("ON"));
document.getElementById("addLedOffBtn").addEventListener("click", () => addLogic("OFF"));

studentModeBtn.addEventListener("click", () => setMode("student"));
teacherModeBtn.addEventListener("click", () => setMode("teacher"));
batteryVoltageRange.addEventListener("input", (e) => {
  setBatteryVoltage(Number(e.target.value));
});

demoStudentBtn.addEventListener("click", () => fillDemo("student"));
demoTeacherBtn.addEventListener("click", () => fillDemo("teacher"));
authCreateModeBtn?.addEventListener("click", () => openAuthMode("create"));
authLoginModeBtn?.addEventListener("click", () => openAuthMode("login"));
loginBackStepBtn?.addEventListener("click", () => {
  loginCard?.setAttribute("data-step", "1");
  document.querySelectorAll(".login-step").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.loginStep === "1");
  });
  document.getElementById("loginStepOne")?.classList.add("active");
  document.getElementById("loginStepTwo")?.classList.remove("active");
});
if(googleAuthBtn){
  googleAuthBtn.hidden = !(firebaseApi.auth.GoogleAuthProvider && auth.signInWithPopup);
  googleAuthBtn.addEventListener("click", loginWithGoogle);
}
enterBtn.addEventListener("click", enterPlatform);

document.querySelectorAll("[data-example]").forEach(el => {
  const title = el.querySelector("b")?.textContent?.trim() || "example";
  bindTileAction(el, () => loadExample(el.dataset.example), `Load ${title} project`);
});

aiTeacherSendBtn.addEventListener("click", sendAiTeacherMessage);
aiTeacherInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    sendAiTeacherMessage();
  }
});

document.addEventListener("keydown", (e) => {
  if(e.key === "Enter" && !loginScreen.classList.contains("hidden")){
    enterPlatform();
  }
}); 

loginName.addEventListener("input", () => {
  loginName.classList.remove("error");
});

loginEmail.addEventListener("input", () => {
  loginEmail.classList.remove("error");
});

loginClass.addEventListener("input", () => {
  loginClass.classList.remove("error");
});

loginSchool.addEventListener("input", () => {
  loginSchool.classList.remove("error");
});

loginSchoolUser.addEventListener("input", () => {
  loginSchoolUser.classList.remove("error");
});

loginSchoolPass.addEventListener("input", () => {
  loginSchoolPass.classList.remove("error");
});

toggleLoginPasswordBtn.addEventListener("click", () => {
  loginSchoolPass.type = loginSchoolPass.type === "password" ? "text" : "password";
  syncLoginPasswordToggle();
  loginSchoolPass.focus();
  loginSchoolPass.setSelectionRange(loginSchoolPass.value.length, loginSchoolPass.value.length);
});

loginRole.addEventListener("change", syncRoleFields);
 
  
document.getElementById("languageSelect")?.addEventListener("change", event => {
  const nextLang = event.target.value;
  state.lang = LANGUAGE_CODES.has(nextLang) ? nextLang : "en";
  applyLanguage();
  showToast(getLanguageOption(state.lang).toast);
});

workspaceArea.addEventListener("wheel", (e) => {
  if(!e.ctrlKey) return;
  e.preventDefault();
  if(e.deltaY < 0){
    state.zoom = Math.min(2, +(state.zoom + 0.05).toFixed(2));
  } else {
    state.zoom = Math.max(0.5, +(state.zoom - 0.05).toFixed(2));
  }
  updateZoom();
}, { passive:false });

window.addEventListener("resize", syncWorkspaceDockLayout);

if(typeof ResizeObserver === "function" && logicDock){
  const logicDockObserver = new ResizeObserver(() => syncWorkspaceDockLayout());
  logicDockObserver.observe(logicDock);
}

function captureText(){
  document.querySelectorAll("h1, h2, h3, button, label, span, p, b, small").forEach(el => {
    const text = el.textContent.trim();
    if(
      el.children.length === 0 &&
      !DYNAMIC_TEXT_IDS.has(el.id) &&
      TRANSLATABLE_TEXT_KEYS.has(text)
    ){
      el.setAttribute("data-en", text);
    }
  });
}

renderComponentCards();
renderLogicCards();
renderVoltageGuide();
renderLogic();
syncWorkspaceDockLayout();
renderItems();
installDelegatedUiActions();
syncBatteryVoltageControls();
syncRoleFields();
syncLoginPasswordToggle();
window.educircuitApp = {
  state,
  auth,
  db,
  componentCatalog,
  logicCatalog,
  deepClone,
  normalizeKey,
  getCatalog,
  showToast,
  refreshSimulation,
  renderItems,
  renderLogic,
  drawWires,
  updateOutputs,
  updateTeacherStats,
  applyAuthenticatedProfile,
  ensureLocalUserRecord,
  saveProject,
  saveProjectToFirebase,
  openProjectsPage,
  openStudentProjectsPage,
  renderProjectsPage,
  renderStudentProjectsPage,
  setMode,
  addComponent,
  addLogic,
  toggleSwitchItem,
  clearProject,
  submitProject,
  applyGrade,
  renameProject,
  fillDemo,
  resetAuthenticatedUser,
  getProjectSnapshot(){
    return {
      id: state.remoteProjectId || null,
      name: state.projectName,
      items: deepClone(state.items),
      wires: deepClone(state.wires),
      logic: deepClone(state.logic),
      challengeId: state.activeAssignment?.challengeId || state.learning?.selectedChallengeId || "",
      assignmentId: state.activeAssignment?.id || null,
      assignmentTitle: state.activeAssignment?.title || "",
      assignmentDueDate: state.activeAssignment?.dueDate || "",
      grade: gradeText.textContent,
      status: statusText.textContent,
      feedback: teacherCommentInput.value.trim(),
      ownerName: state.projectOwnerName || state.user.name,
      schoolId: state.user.schoolKey,
      school: state.user.school,
      className: state.user.className,
      role: state.user.role,
      defaultBatteryVoltage: state.defaultBatteryVoltage
    };
  },
  applyProjectSnapshot(project, options = {}){
    const snapshot = project || {};
    state.items = deepClone(snapshot.items || []);
    state.wires = deepClone(snapshot.wires || []);
    state.logic = deepClone(snapshot.logic || []);
    state.projectName = snapshot.name || "Untitled STEM Project";
    state.projectOwnerName = options.ownerName || snapshot.ownerName || state.user.name;
    state.currentProjectIndex = options.currentProjectIndex ?? null;
    state.logicArmed = false;
    state.remoteProjectId = snapshot.id || options.projectId || null;
    state.activeAssignment = snapshot.assignmentId || snapshot.assignmentTitle
      ? {
          id: snapshot.assignmentId || null,
          title: snapshot.assignmentTitle || snapshot.name || "Assignment",
          dueDate: snapshot.assignmentDueDate || "",
          challengeId: snapshot.challengeId || state.learning?.selectedChallengeId || "led-circuit"
        }
      : null;
    if (snapshot.challengeId) {
      state.learning = state.learning || {};
      state.learning.selectedChallengeId = snapshot.challengeId;
    }
    state.defaultBatteryVoltage = Number(snapshot.defaultBatteryVoltage || state.defaultBatteryVoltage || 5);
    projectNameText.textContent = state.projectName;
    gradeText.textContent = snapshot.grade || "Not graded";
    statusText.textContent = snapshot.status || "Not Submitted";
    teacherSubmissionState.textContent = snapshot.status || "Pending";
    teacherGradeState.textContent = snapshot.grade || "Not graded";
    teacherGradeInput.value = snapshot.grade && snapshot.grade !== "Not graded" ? snapshot.grade : "";
    teacherCommentInput.value = snapshot.feedback || "";
    syncNextId();
    syncBatteryVoltageFromItems();
    refreshSimulation();
    renderItems();
    renderLogic();
    drawWires();
  },
  elements: {
    loginName,
    loginRole,
    loginClass,
    loginSchool,
    loginSchoolUser,
    loginSchoolPass,
    rememberLogin,
    authCreateModeBtn,
    authLoginModeBtn,
    googleAuthBtn,
    enterBtn,
    demoStudentBtn,
    demoTeacherBtn,
    teacherGradeInput,
    teacherCommentInput,
    projectsPage: document.getElementById("projectsPage"),
    studentProjectsPage: document.getElementById("studentProjectsPage"),
    workspaceArea
  }
};
captureText();
applyLanguage();
updateTeacherStats();
updateOutputs();
updateZoom();
loadProject();
syncEducircuitPageView({ force: true });
