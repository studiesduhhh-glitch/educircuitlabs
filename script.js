import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1sGDTh1PECJrPXGkmqmP-_1nUyBmxNvU",
  authDomain: "educircuitlabs.firebaseapp.com",
  projectId: "educircuitlabs",
  storageBucket: "educircuitlabs.firebasestorage.app",
  messagingSenderId: "1031956078247",
  appId: "1:1031956078247:web:3a2c0033f51773b0c98582"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firebaseAuth = getAuth(app);
const firestore = getFirestore(app);

function normalizeFirestoreData(value){
  if(value instanceof Date){
    return Timestamp.fromDate(value);
  }

  if(Array.isArray(value)){
    return value.map(normalizeFirestoreData);
  }

  if(value && typeof value === "object" && value.constructor === Object){
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeFirestoreData(nestedValue)])
    );
  }

  return value;
}

function createDocWrapper(collectionName, id){
  const docRef = doc(firestore, collectionName, id);

  return {
    async get(){
      const snapshot = await getDoc(docRef);
      return {
        id: snapshot.id,
        exists: snapshot.exists(),
        data: () => snapshot.data()
      };
    },
    async set(data){
      await setDoc(docRef, normalizeFirestoreData(data));
    },
    async update(data){
      await updateDoc(docRef, normalizeFirestoreData(data));
    },
    async delete(){
      await deleteDoc(docRef);
    }
  };
}

function createCollectionWrapper(collectionName, constraints = []){
  return {
    doc(id){
      return createDocWrapper(collectionName, id);
    },
    where(field, operator, value){
      return createCollectionWrapper(collectionName, [...constraints, where(field, operator, value)]);
    },
    async add(data){
      const docRef = await addDoc(
        collection(firestore, collectionName),
        normalizeFirestoreData(data)
      );
      return { id: docRef.id };
    },
    async get(){
      const baseCollection = collection(firestore, collectionName);
      const snapshot = constraints.length
        ? await getDocs(query(baseCollection, ...constraints))
        : await getDocs(baseCollection);

      return {
        docs: snapshot.docs.map((snapshotDoc) => ({
          id: snapshotDoc.id,
          data: () => snapshotDoc.data()
        }))
      };
    }
  };
}

const auth = {
  get currentUser(){
    return firebaseAuth.currentUser;
  },
  onAuthStateChanged(callback){
    return onAuthStateChanged(firebaseAuth, callback);
  },
  async createUserWithEmailAndPassword(email, password){
    return createUserWithEmailAndPassword(firebaseAuth, email, password);
  },
  async signInWithEmailAndPassword(email, password){
    return signInWithEmailAndPassword(firebaseAuth, email, password);
  },
  async signOut(){
    return signOut(firebaseAuth);
  }
};

const db = {
  collection(collectionName){
    return createCollectionWrapper(collectionName);
  }
};

const state = {
      schools: {},
      user: {
        uid: "",
        name: "",
        email: "",
        role: "student",
        className: "",
        school: "",
        schoolId: ""
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
      currentProjectDocId: null,
      myProjects: [],
      schoolProjects: [],
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
        fix: "Correct connection: Battery + -> component +, then final component - -> Battery -."
      },
      activeItems: [],
      aiTeacherMessages: [],
      burstItems: []
    };
    state.lang = "en";

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
        "Buzzer": "பஸர்"
      }
    };

function applyLanguage(){
  const lang = state.lang;

  document.querySelectorAll("[data-en]").forEach(el => {
    const original = el.getAttribute("data-en");

    if(lang === "ta" && translations.ta[original]){
      el.textContent = translations.ta[original];
    } else {
      el.textContent = original;
    }
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
    const loginRole = document.getElementById("loginRole");
    const loginClass = document.getElementById("loginClass");
    const loginSchool = document.getElementById("loginSchool");
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const enterBtn = document.getElementById("enterBtn");
    const signUpBtn = document.getElementById("signUpBtn");
    const demoStudentBtn = document.getElementById("demoStudentBtn");
    const demoTeacherBtn = document.getElementById("demoTeacherBtn");
    const activeUserPill = document.getElementById("activeUserPill");
    let currentUserProfile = null;

    const componentGrid = document.getElementById("componentGrid");
    const logicBlockList = document.getElementById("logicBlockList");
    const itemsLayer = document.getElementById("itemsLayer");
    const deleteBin = document.getElementById("deleteBin");
    const wireLayer = document.getElementById("wireLayer");
    const logicList = document.getElementById("logicList");
    const canvasWorld = document.getElementById("canvasWorld");
    const workspaceArea = document.getElementById("workspaceArea");
    const zoomDisplay = document.getElementById("zoomDisplay");
    const toast = document.getElementById("toast");
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

    function resetWorkspaceForUser(){
      state.items = [];
      state.wires = [];
      state.logic = [];
      state.selectedPort = null;
      state.currentProjectIndex = null;
      state.currentProjectDocId = null;
      state.projectName = "Untitled STEM Project";
      state.projectOwnerName = state.user.name;
      state.logicArmed = false;
      state.outputs.led = false;
      state.outputs.motor = false;
      state.outputs.buzzer = false;
      state.outputs.overload = false;
      state.activeItems = [];
      state.burstItems = [];
      projectNameText.textContent = state.projectName;
      gradeText.textContent = "Not graded";
      teacherGradeState.textContent = "Not graded";
      statusText.textContent = "Draft";
      teacherSubmissionState.textContent = "Draft";
      syncNextId();
      syncBatteryVoltageControls();
      renderItems();
      renderLogic();
      drawWires();
      updateTeacherStats();
      updateOutputs();
    }

    function requireFirebase(){
      return Boolean(auth && db);
    }

    async function fetchUserProfile(uid){
      for(let attempt = 0; attempt < 5; attempt++){
        const doc = await db.collection("users").doc(uid).get();
        if(doc.exists){
          return doc.data();
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      throw new Error("User profile not found in Firestore");
    }

    function applyAuthenticatedUser(firebaseUser, profile){
      currentUserProfile = profile;
      state.user.uid = firebaseUser.uid;
      state.user.email = firebaseUser.email || "";
      state.user.name = profile.name || "";
      state.user.role = profile.role || "student";
      state.user.className = profile.className || loginClass.value.trim();
      state.user.school = profile.schoolId || "";
      state.user.schoolId = profile.schoolId || "";
      state.projectOwnerName = state.user.name;
      activeUserPill.textContent = `${state.user.name} • ${state.user.role}`;
      loginScreen.classList.add("hidden");
      setMode(state.user.role);
    }

    async function syncProjectsForRole(){
      if(!auth?.currentUser || !currentUserProfile) return;

      await loadMyProjects();
      if(currentUserProfile.role === "teacher"){
        await loadSchoolProjects();
      } else {
        state.schoolProjects = [];
      }
    }

    async function handleSignedInUser(firebaseUser){
      const profile = await fetchUserProfile(firebaseUser.uid);
      applyAuthenticatedUser(firebaseUser, profile);
      resetWorkspaceForUser();
      await syncProjectsForRole();
      renderProjectsPage();
      renderProjectList();
      renderStudentProjectsPage();
      showToast("Welcome, " + state.user.name);
    }

    async function signUpUser(){
      if(!requireFirebase()) return;

      const name = loginName.value.trim();
      const role = loginRole.value;
      const className = loginClass.value.trim();
      const schoolId = loginSchool.value.trim();
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();

      loginName.classList.remove("error");
      loginSchool.classList.remove("error");

      let hasError = false;
      if(name.length < 3){
        loginName.classList.add("error");
        hasError = true;
      }
      if(!schoolId){
        loginSchool.classList.add("error");
        hasError = true;
      }
      if(!email || !password){
        hasError = true;
      }
      if(hasError){
        alert("Please fill name, school, email, and password");
        return;
      }

      try{
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection("users").doc(cred.user.uid).set({
          name,
          role,
          schoolId,
          className
        });
        showToast("Account created");
      } catch(error){
        alert(error.message || "Signup failed");
      }
    }

    async function loginUser(){
      if(!requireFirebase()) return;

      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();

      if(!email || !password){
        alert("Enter email and password");
        return;
      }

      try{
        await auth.signInWithEmailAndPassword(email, password);
      } catch(error){
        alert(error.message || "Login failed");
      }
    }

    async function logoutUser(){
      if(!requireFirebase()) return;

      try{
        await auth.signOut();
      } catch(error){
        alert(error.message || "Logout failed");
      }
    }

    async function saveProjectToFirebase(){
      if(!requireFirebase()) return;
      if(!auth.currentUser || !currentUserProfile){
        showToast("Login required");
        return;
      }

      const payload = {
        userId: auth.currentUser.uid,
        schoolId: currentUserProfile.schoolId,
        userName: state.projectOwnerName || state.user.name,
        name: state.projectName,
        items: deepClone(state.items),
        wires: deepClone(state.wires),
        logic: deepClone(state.logic),
        grade: gradeText.textContent || "Not graded",
        status: statusText.textContent || "Draft",
        updatedAt: new Date(),
        createdAt: new Date()
      };

      try{
        if(state.currentProjectDocId){
          payload.createdAt = state.myProjects[state.currentProjectIndex]?.createdAt || new Date();
          await db.collection("projects").doc(state.currentProjectDocId).update(payload);
        } else {
          const docRef = await db.collection("projects").add(payload);
          state.currentProjectDocId = docRef.id;
        }
        await syncProjectsForRole();
        state.currentProjectIndex = state.myProjects.findIndex(project => project.id === state.currentProjectDocId);
        renderProjectsPage();
        renderProjectList();
        renderStudentProjectsPage();
        showToast("Project saved");
      } catch(error){
        showToast(error.message || "Project save failed");
      }
    }

    async function loadMyProjects(){
      if(!requireFirebase() || !auth.currentUser) return [];

      const snapshot = await db.collection("projects")
        .where("userId", "==", auth.currentUser.uid)
        .get();

      state.myProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return state.myProjects;
    }

    async function loadSchoolProjects(){
      if(!requireFirebase() || !currentUserProfile?.schoolId) return [];

      const snapshot = await db.collection("projects")
        .where("schoolId", "==", currentUserProfile.schoolId)
        .get();

      state.schoolProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return state.schoolProjects;
    }

    function applyProjectToWorkspace(proj, projectIndex){
      if(!proj) return;

      state.items = deepClone(proj.items || []);
      state.wires = deepClone(proj.wires || []);
      state.logic = deepClone(proj.logic || []);
      state.projectName = proj.name || "Untitled STEM Project";
      state.currentProjectIndex = projectIndex;
      state.currentProjectDocId = proj.id || null;
      state.projectOwnerName = proj.userName || state.user.name;
      state.logicArmed = false;
      projectNameText.textContent = state.projectName;
      gradeText.textContent = proj.grade || "Not graded";
      teacherGradeState.textContent = proj.grade || "Not graded";
      statusText.textContent = proj.status || "Draft";
      teacherSubmissionState.textContent = proj.status || "Draft";
      syncNextId();
      syncBatteryVoltageFromItems();
      refreshSimulation();
      renderItems();
      renderLogic();
      drawWires();
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
      return "Correct connection: Battery + -> first component + -> next component + through the chain, then final component - -> Battery -.";
    }

    function buildCoachState(status, hint, fix){
      return { status, hint, fix };
    }

    function evaluateCircuitState(){
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
      const samePolarityWire = state.wires.find(wire =>
        (wire.from.port === "positive" && wire.to.port === "positive") ||
        (wire.from.port === "negative" && wire.to.port === "negative")
      );

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

    function renderComponentCards(){
      componentGrid.innerHTML = "";
      componentCatalog.forEach(comp => {
        const card = document.createElement("div");
        card.className = "component-card";
        card.innerHTML = `
          <div class="component-icon">${comp.icon}</div>
          <div class="component-name">${comp.type}</div>
          <div class="component-meta">${comp.desc}</div>
        `;
        card.addEventListener("click", () => addComponent(comp.type));
        componentGrid.appendChild(card);
      });
    }

    function renderLogicCards(){
      logicBlockList.innerHTML = "";
      logicCatalog.forEach(name => {
        const item = document.createElement("div");
        item.className = "example-item";
        item.innerHTML = `<b>${name}</b>Click to add to logic workspace`;
        item.addEventListener("click", () => addLogic(name));
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

      if(state.aiTeacherMessages.length === 0){
        addAiTeacherMessage(
          "teacher",
          "Hello! I’m your AI Teacher. Ask me anything about circuits, voltage, current, components, logic blocks, or the project on your screen, and I’ll explain it step by step."
        );
      }

      setTimeout(() => aiTeacherInput.focus(), 50);
    }

    function closeAiTeacherPage(){
      aiTeacherPage.classList.add("hidden");
    }

      function renderProjectsPage(){
        const container = document.getElementById("projectsPageList");
        container.innerHTML = "";

        if(state.myProjects.length === 0){
          container.innerHTML = "<p>No projects yet</p>";
          return;
        }

        state.myProjects.forEach((proj, index) => {
          const div = document.createElement("div");

           div.style = `
             background:white;
             border:1px solid #dbe3f0;
             border-radius:14px;
             padding:14px;
             box-shadow:0 10px 20px rgba(0,0,0,0.05);
           `;

           div.innerHTML = `
            <h3>${proj.name}</h3>
            <p style="color:gray; font-size:12px;">${proj.createdAt?.toDate ? proj.createdAt.toDate().toLocaleString() : "Saved project"}</p>

            <div style="display:flex; gap:8px; margin-top:10px;">
              <button onclick="loadSavedProject(${index})">Open</button>
              <button onclick="deleteProject(${index})" class="red">Delete</button>
            </div>
           `;

           container.appendChild(div);
         });
       }

    function renderProjectList(){
      const container = document.getElementById("projectList");
      if(!container) return;

      if(state.myProjects.length === 0){
        container.innerHTML = "<p style='color:gray'>No projects yet</p>";
        return;
      }

      container.innerHTML = "";
      state.myProjects.forEach((proj, index) => {
        const div = document.createElement("div");
        div.className = "project-item";

        div.innerHTML = `
          <div class="project-info">
            <div class="project-name">${proj.name}</div>
            <div class="project-date">${proj.createdAt?.toDate ? proj.createdAt.toDate().toLocaleString() : "Saved project"}</div>
          </div>
          <div class="project-actions">
            <button class="secondary" onclick="loadSavedProject(${index})">Open</button>
            <button class="red" onclick="deleteProject(${index})">Delete</button>
          </div>
        `;

        container.appendChild(div);
      });
    }

    function renderStudentProjectsPage(){
      const container = document.getElementById("studentProjectsPageList");
      if(!container) return;

      if(state.user.role !== "teacher"){
        container.innerHTML = "<p>Teacher mode only</p>";
        return;
      }

      if(state.schoolProjects.length === 0){
        container.innerHTML = "<p>No student projects yet</p>";
        return;
      }

      container.innerHTML = "";
      state.schoolProjects.forEach((proj, index) => {
        const div = document.createElement("div");
        div.style = `
          background:white;
          border:1px solid #dbe3f0;
          border-radius:14px;
          padding:14px;
          box-shadow:0 10px 20px rgba(0,0,0,0.05);
        `;

        div.innerHTML = `
          <h3>${proj.name}</h3>
          <p style="color:gray; font-size:12px; margin:0 0 6px;">${proj.userName || "Student"}</p>
          <p style="color:gray; font-size:12px; margin:0 0 6px;">${proj.createdAt?.toDate ? proj.createdAt.toDate().toLocaleString() : "Saved project"}</p>
          <p style="font-size:12px; margin:0; color:#16a34a; font-weight:700;">Grade: ${proj.grade || "Not graded"}</p>

          <div style="display:flex; gap:8px; margin-top:10px;">
            <button onclick="openStudentProject(${index})">Open</button>
          </div>
        `;

        container.appendChild(div);
      });
    }

    function openStudentProject(index){
      const proj = state.schoolProjects[index];
      if(!proj) return;

      applyProjectToWorkspace(proj, index);
      closeStudentProjectsPage();
      showToast(`${proj.userName || "Student"}'s project loaded`);
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
      const name = state.lang === "ta" && translations.ta[type] ? translations.ta[type] : type;
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
        el.dataset.id = item.id;
        el.style.left = item.x + "px";
        el.style.top = item.y + "px";

        let statusHtml = "";
        if(state.burstItems.includes(item.id)){
          statusHtml = `<div class="burst-indicator">💥</div>`;
        } else if(item.type === "Switch" || item.type === "Relay"){
          statusHtml = `<div class="pill" style="padding:4px 8px;font-size:11px;">${item.isClosed ? "Closed" : "Open"}</div>`;
        } else if(item.type === "LED"){
          statusHtml = `<div class="led-indicator ${state.activeItems.includes(item.id) ? "on" : ""}"></div>`;
        } else if(item.type === "Motor" || item.type === "Pump" || item.type === "Servo"){
          statusHtml = `<div class="motor-wheel ${state.activeItems.includes(item.id) ? "on" : ""}"></div>`;
        } else if(item.type === "Buzzer"){
          statusHtml = `<div class="buzzer-wave ${state.activeItems.includes(item.id) ? "on" : ""}"></div>`;
        } else {
          statusHtml = `<div style="font-size:18px">${cfg.icon}</div>`;
        }

        el.innerHTML = `
          <div class="item-head">
           <b>${cfg.icon} ${translations.ta[item.type] && state.lang === "ta" ? translations.ta[item.type] : item.type}</b>
            ${statusHtml}
          </div>
          <div class="item-body">${cfg.desc}${item.type === "Battery" ? `<span class="terminal-hint">${Number(item.voltage ?? state.defaultBatteryVoltage).toFixed(1)}V output</span>` : `<span class="terminal-hint">- left • + right</span>`}</div>
        `;

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
    }


    function loadSavedProject(index){
      const proj = state.myProjects[index];
      applyProjectToWorkspace(proj, index);
      closeProjectsPage();

      showToast("Project loaded 🚀");
    }

    async function deleteProject(index){
      if(!requireFirebase()) return;

      const proj = state.myProjects[index];
      if(!proj?.id) return;

      try{
        await db.collection("projects").doc(proj.id).delete();

        if(state.currentProjectDocId === proj.id){
          state.currentProjectIndex = null;
          state.currentProjectDocId = null;
        } else if(state.currentProjectIndex !== null && state.currentProjectIndex > index){
          state.currentProjectIndex -= 1;
        }

        await loadMyProjects();
        renderProjectsPage();
        renderProjectList();
        showToast("Project deleted");
      } catch(error){
        showToast(error.message || "Delete failed");
      }
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

    drawWires();
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
      drawWires();
      refreshSimulation();
      updateTeacherStats();
      showToast("Wire connected");
    }

    function getItemById(id){
      return state.items.find(i => i.id === id);
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
   

    function addLogic(name){
      state.logic.push(name);
      renderLogic();
      updateTeacherStats();
      const label = state.lang === "ta" && translations.ta[name] ? translations.ta[name] : name;
      showToast(label + (state.lang === "ta" ? " சேர்க்கப்பட்டது" : " added"));
    }

    function renderLogic(){
      logicList.innerHTML = "";

      state.logic.forEach((step, index) => {
        const chip = document.createElement("div");
        chip.className = "logic-chip";

        const label = state.lang === "ta" && translations.ta[step]
          ? translations.ta[step]
          : step;

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

  drawWires();
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
      resetOutputs(false);
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

    async function submitProject(){
      statusText.textContent = "Submitted";
      teacherSubmissionState.textContent = "Submitted";
      if(state.currentProjectDocId && requireFirebase()){
        await db.collection("projects").doc(state.currentProjectDocId).update({
          status: "Submitted"
        });
        await syncProjectsForRole();
      }
      showToast("Project submitted");
    }

    async function applyGrade(){
      const value = document.getElementById("teacherGrade").value.trim();
      if(!value){
        showToast("Enter a grade first");
        return;
      }
      gradeText.textContent = value;
      teacherGradeState.textContent = value;
      if(state.currentProjectDocId && requireFirebase()){
        await db.collection("projects").doc(state.currentProjectDocId).update({
          grade: value,
          status: "Graded",
          gradedAt: new Date()
        });
        await syncProjectsForRole();
        renderStudentProjectsPage();
      }
      showToast("Grade applied");
    }

    function renameProject(){
      const next = prompt("Enter project name", state.projectName);
      if(next && next.trim()){
        state.projectName = next.trim();
        projectNameText.textContent = state.projectName;
        showToast("Project renamed");
      }
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
    localStorage.setItem("hideLanding", "true");
  }

  document.getElementById("landingPage").style.display = "none";
}

// 📘 GUIDE CONTROL
function openGuide(){
  document.getElementById("guidePage").classList.remove("hidden");
}

function closeGuide(){
  document.getElementById("guidePage").classList.add("hidden");
}

// 🔥 AUTO HIDE LANDING
if(localStorage.getItem("hideLanding") === "true"){
  document.getElementById("landingPage").style.display = "none";
}

    function saveProject(){
      saveProjectToFirebase();
    }

    function loadProject(){
      if(auth && db){
        auth.onAuthStateChanged(async (firebaseUser) => {
          if(firebaseUser){
            try{
              await handleSignedInUser(firebaseUser);
            } catch(error){
              console.error(error);
              showToast(error.message || "Failed to load user");
            }
          } else {
            currentUserProfile = null;
            state.user.uid = "";
            state.user.email = "";
            state.user.name = "";
            state.user.role = "student";
            state.user.className = "";
            state.user.school = "";
            state.user.schoolId = "";
            state.projectOwnerName = "";
            state.myProjects = [];
            state.schoolProjects = [];
            state.currentProjectDocId = null;
            loginScreen.classList.remove("hidden");
            activeUserPill.textContent = "Guest • Student";
            resetWorkspaceForUser();
          }
        });
      }
    }

    function fillDemo(role){
      loginName.value = role === "teacher" ? "Demo Teacher" : "Demo Student";
      loginRole.value = role;
      loginClass.value = "10-A";
      loginSchool.value = "STEM Academy";
      loginEmail.value = role === "teacher" ? "teacher@example.com" : "student@example.com";
      loginPassword.value = "password123";
    }

    function enterPlatform(){
      loginUser();
    }

    function openProjectsPage(){
      document.getElementById("projectsPage").classList.remove("hidden");
      renderProjectsPage();
    }

    function closeProjectsPage(){
      document.getElementById("projectsPage").classList.add("hidden");
    }

    function openStudentProjectsPage(){
      document.getElementById("studentProjectsPage").classList.remove("hidden");
      renderStudentProjectsPage();
    }

    function closeStudentProjectsPage(){
      document.getElementById("studentProjectsPage").classList.add("hidden");
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
      workspaceArea.style.backgroundSize = state.gridVisible ? "24px 24px, 24px 24px, auto" : "0 0, 0 0, auto";
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

    document.getElementById("saveBtn").addEventListener("click", saveProject);
    document.getElementById("aiTeacherBtn").addEventListener("click", openAiTeacherPage);
    document.getElementById("clearBtn").addEventListener("click", clearProject);
    document.getElementById("submitBtn").addEventListener("click", submitProject);
    document.getElementById("applyGradeBtn").addEventListener("click", applyGrade);
    document.getElementById("renameBtn").addEventListener("click", renameProject);
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
    signUpBtn.addEventListener("click", signUpUser);
    enterBtn.addEventListener("click", enterPlatform);

    document.querySelectorAll("[data-example]").forEach(el => {
      el.addEventListener("click", () => loadExample(el.dataset.example));
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

    loginClass.addEventListener("input", () => {
      loginClass.classList.remove("error");
    });

    loginSchool.addEventListener("input", () => {
      loginSchool.classList.remove("error");
    });

    loginEmail.addEventListener("input", () => {
      loginEmail.classList.remove("error");
    });

    loginPassword.addEventListener("input", () => {
      loginPassword.classList.remove("error");
    });
     
  
    document.getElementById("langToggleBtn").addEventListener("click", () => {
      state.lang = state.lang === "en" ? "ta" : "en";

      applyLanguage();

      const btn = document.getElementById("langToggleBtn");
      btn.textContent = state.lang === "en" ? "தமிழ்" : "English";

      showToast(state.lang === "ta" ? "மொழி மாற்றப்பட்டது 🌐" : "Language switched 🌐");
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

    function captureText(){
      document.querySelectorAll("h1, h2, h3, button, label, span, p, b, small").forEach(el => {
        if(el.children.length === 0){
          el.setAttribute("data-en", el.textContent.trim());
       }
      });
    }

    renderComponentCards();
    renderLogicCards();
    renderVoltageGuide();
    renderLogic();
    renderItems();
    syncBatteryVoltageControls();
    captureText();
    applyLanguage();
    updateTeacherStats();
    updateOutputs();
    updateZoom();
    loadProject();
