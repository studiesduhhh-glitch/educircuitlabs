export const ACADEMIES_PAYLOAD = {
  academies: [
    {
      id: "velocity-cricket-lab",
      name: "Velocity Cricket Lab",
      sport: "Cricket",
      city: "Hyderabad",
      area: "Gachibowli",
      locationLabel: "Gachibowli, Hyderabad",
      description:
        "High-performance cricket coaching with match simulation, video analysis, and progression pathways for school and district players.",
      rating: 4.8,
      reviewCount: 128,
      monthlyFee: 4800,
      feeLabel: "₹4,800 / month",
      priceTier: "mid",
      batchTimings: [
        "Mon-Sat • 6:00 AM - 8:00 AM",
        "Mon-Wed-Fri • 4:30 PM - 6:30 PM"
      ],
      coaches: [
        {
          name: "Arjun Menon",
          specialty: "Batting and performance analysis",
          experience: "Level 2 coach • 12 years"
        },
        {
          name: "Samar Naik",
          specialty: "Fast bowling workloads",
          experience: "Former state player • 9 years"
        }
      ],
      facilities: ["Turf wickets", "Video analysis", "Strength room", "Parking"],
      images: ["assets/academy-cricket-1.svg", "assets/academy-cricket-2.svg"],
      contact: {
        phone: "+91 98450 12010",
        email: "hello@velocitycricket.in",
        whatsapp: "+919845012010",
        website: "https://coachnestly.app/demo/velocity-cricket-lab",
        mapQuery: "Velocity Cricket Lab Gachibowli Hyderabad"
      },
      coordinates: { lat: 17.4401, lng: 78.3489 },
      mapPosition: { x: 68, y: 42 },
      featured: true,
      topRated: true,
      trending: true,
      ageGroups: ["under-10", "11-14", "15-18"],
      goals: ["beginner", "competitive", "elite"],
      idealFor:
        "Young cricketers who want structured match preparation without losing the joy of daily training.",
      badges: ["Scholarship trials", "Match analytics"]
    },
    {
      id: "goalforge-football-collective",
      name: "GoalForge Football Collective",
      sport: "Football",
      city: "Bengaluru",
      area: "Indiranagar",
      locationLabel: "Indiranagar, Bengaluru",
      description:
        "Football training built for grassroots athletes with technical drills, league prep, and conditioning across age bands.",
      rating: 4.7,
      reviewCount: 94,
      monthlyFee: 4200,
      feeLabel: "₹4,200 / month",
      priceTier: "value",
      batchTimings: [
        "Tue-Thu-Sat • 6:00 AM - 7:30 AM",
        "Mon-Fri • 5:00 PM - 6:30 PM"
      ],
      coaches: [
        {
          name: "Nikhil D'Souza",
          specialty: "Grassroots football systems",
          experience: "UEFA C certified • 10 years"
        },
        {
          name: "Karen Mathew",
          specialty: "Speed and agility",
          experience: "Performance coach • 7 years"
        }
      ],
      facilities: ["Floodlit turf", "Recovery zone", "Match video room", "Parent seating"],
      images: ["assets/academy-football-1.svg", "assets/academy-court-1.svg"],
      contact: {
        phone: "+91 98861 09012",
        email: "team@goalforge.in",
        whatsapp: "+919886109012",
        website: "https://coachnestly.app/demo/goalforge-football-collective",
        mapQuery: "GoalForge Football Collective Indiranagar Bengaluru"
      },
      coordinates: { lat: 12.9719, lng: 77.6412 },
      mapPosition: { x: 56, y: 58 },
      featured: true,
      topRated: true,
      trending: true,
      ageGroups: ["under-10", "11-14", "15-18"],
      goals: ["beginner", "competitive", "fitness"],
      idealFor:
        "Students who thrive in team environments and want both technical training and league exposure.",
      badges: ["Weekend league access", "Performance tracking"]
    },
    {
      id: "bluewave-swim-studio",
      name: "BlueWave Swim Studio",
      sport: "Swimming",
      city: "Mumbai",
      area: "Powai",
      locationLabel: "Powai, Mumbai",
      description:
        "A confidence-first swim academy with coach-monitored lanes, stroke correction, and competition progression for all levels.",
      rating: 4.9,
      reviewCount: 176,
      monthlyFee: 5600,
      feeLabel: "₹5,600 / month",
      priceTier: "premium",
      batchTimings: [
        "Mon-Sat • 6:30 AM - 8:30 AM",
        "Tue-Thu-Sat • 4:00 PM - 6:00 PM"
      ],
      coaches: [
        {
          name: "Rhea Deshpande",
          specialty: "Stroke technique and water confidence",
          experience: "National swimmer • 11 years"
        },
        {
          name: "Aman Lobo",
          specialty: "Competition pacing",
          experience: "Race coach • 8 years"
        }
      ],
      facilities: ["Temperature-controlled pool", "Kickboard library", "Changing suites", "Parent lounge"],
      images: ["assets/academy-swimming-1.svg", "assets/academy-fitness-1.svg"],
      contact: {
        phone: "+91 98339 41010",
        email: "hello@bluewaveaquatics.in",
        whatsapp: "+919833941010",
        website: "https://coachnestly.app/demo/bluewave-swim-studio",
        mapQuery: "BlueWave Swim Studio Powai Mumbai"
      },
      coordinates: { lat: 19.1186, lng: 72.9074 },
      mapPosition: { x: 76, y: 36 },
      featured: true,
      topRated: true,
      trending: false,
      ageGroups: ["under-10", "11-14", "adult"],
      goals: ["beginner", "fitness", "competitive"],
      idealFor:
        "Parents prioritizing safe early instruction or athletes wanting a stronger stroke foundation before racing.",
      badges: ["Parent progress updates", "Lane-wise skill bands"]
    },
    {
      id: "rallypoint-badminton-hub",
      name: "RallyPoint Badminton Hub",
      sport: "Badminton",
      city: "Bengaluru",
      area: "Koramangala",
      locationLabel: "Koramangala, Bengaluru",
      description:
        "Indoor badminton coaching focused on footwork, rally intelligence, and tournament confidence for intermediate learners.",
      rating: 4.6,
      reviewCount: 72,
      monthlyFee: 3900,
      feeLabel: "₹3,900 / month",
      priceTier: "value",
      batchTimings: [
        "Mon-Fri • 6:00 AM - 7:30 AM",
        "Mon-Wed-Fri • 6:00 PM - 7:30 PM"
      ],
      coaches: [
        {
          name: "Pooja Rao",
          specialty: "Singles movement and rally planning",
          experience: "BWF Level 1 • 9 years"
        },
        {
          name: "Karthik Jain",
          specialty: "Junior fundamentals",
          experience: "Academy coach • 6 years"
        }
      ],
      facilities: ["Wooden courts", "Shuttle vending", "Video replay wall", "Stretch studio"],
      images: ["assets/academy-racket-1.svg", "assets/academy-court-1.svg"],
      contact: {
        phone: "+91 98867 21218",
        email: "hello@rallypointhub.in",
        whatsapp: "+919886721218",
        website: "https://coachnestly.app/demo/rallypoint-badminton-hub",
        mapQuery: "RallyPoint Badminton Hub Koramangala Bengaluru"
      },
      coordinates: { lat: 12.9352, lng: 77.6245 },
      mapPosition: { x: 44, y: 62 },
      featured: false,
      topRated: false,
      trending: true,
      ageGroups: ["under-10", "11-14", "15-18"],
      goals: ["beginner", "competitive"],
      idealFor:
        "Kids and teens looking for a disciplined indoor sport with measurable weekly progress and tournament readiness.",
      badges: ["Indoor all-weather courts", "Weekend match play"]
    },
    {
      id: "apex-tennis-academy",
      name: "Apex Tennis Academy",
      sport: "Tennis",
      city: "Hyderabad",
      area: "Jubilee Hills",
      locationLabel: "Jubilee Hills, Hyderabad",
      description:
        "Tennis training built around consistency, movement quality, and tactical awareness for both recreational and serious athletes.",
      rating: 4.7,
      reviewCount: 81,
      monthlyFee: 6100,
      feeLabel: "₹6,100 / month",
      priceTier: "premium",
      batchTimings: [
        "Mon-Sat • 5:30 AM - 7:00 AM",
        "Mon-Thu • 4:00 PM - 6:00 PM"
      ],
      coaches: [
        {
          name: "Neha Varma",
          specialty: "Junior tennis development",
          experience: "AITA certified • 12 years"
        },
        {
          name: "Harsh Patel",
          specialty: "Serve mechanics",
          experience: "Performance coach • 8 years"
        }
      ],
      facilities: ["Clay court", "Hard court", "Fitness deck", "Parent waiting lounge"],
      images: ["assets/academy-racket-1.svg", "assets/academy-football-1.svg"],
      contact: {
        phone: "+91 98220 73011",
        email: "contact@apextennis.in",
        whatsapp: "+919822073011",
        website: "https://coachnestly.app/demo/apex-tennis-academy",
        mapQuery: "Apex Tennis Academy Jubilee Hills Hyderabad"
      },
      coordinates: { lat: 17.4323, lng: 78.4074 },
      mapPosition: { x: 38, y: 34 },
      featured: false,
      topRated: true,
      trending: false,
      ageGroups: ["11-14", "15-18", "adult"],
      goals: ["competitive", "fitness", "elite"],
      idealFor:
        "Athletes who want premium courts, more personal coaching, and sharper technical progression over time.",
      badges: ["Court analytics", "Technique reviews"]
    },
    {
      id: "courtvision-basketball-house",
      name: "CourtVision Basketball House",
      sport: "Basketball",
      city: "Mumbai",
      area: "Bandra",
      locationLabel: "Bandra, Mumbai",
      description:
        "Basketball coaching for skill IQ, ball handling, and small-group competitive scrimmages that keep students engaged.",
      rating: 4.5,
      reviewCount: 58,
      monthlyFee: 3500,
      feeLabel: "₹3,500 / month",
      priceTier: "value",
      batchTimings: [
        "Tue-Thu-Sat • 6:00 AM - 7:15 AM",
        "Mon-Wed-Fri • 5:30 PM - 7:00 PM"
      ],
      coaches: [
        {
          name: "Dev Fernandes",
          specialty: "Guard development",
          experience: "Club coach • 7 years"
        },
        {
          name: "Nazia Sheikh",
          specialty: "Youth conditioning",
          experience: "Strength coach • 5 years"
        }
      ],
      facilities: ["Indoor hardwood court", "Shooting machine", "Strength corner", "Hydration station"],
      images: ["assets/academy-court-1.svg", "assets/academy-fitness-1.svg"],
      contact: {
        phone: "+91 98195 88002",
        email: "hello@courtvision.in",
        whatsapp: "+919819588002",
        website: "https://coachnestly.app/demo/courtvision-basketball-house",
        mapQuery: "CourtVision Basketball House Bandra Mumbai"
      },
      coordinates: { lat: 19.0594, lng: 72.8295 },
      mapPosition: { x: 33, y: 57 },
      featured: false,
      topRated: false,
      trending: true,
      ageGroups: ["11-14", "15-18", "adult"],
      goals: ["fitness", "competitive", "beginner"],
      idealFor:
        "Students who learn best through high-energy group sessions and visible skill progression every week.",
      badges: ["Weekend scrimmages", "Youth camps"]
    },
    {
      id: "ironpulse-boxing-loft",
      name: "IronPulse Boxing Loft",
      sport: "Boxing",
      city: "Hyderabad",
      area: "Madhapur",
      locationLabel: "Madhapur, Hyderabad",
      description:
        "A modern boxing studio balancing technique, discipline, conditioning, and confidence-building for teens and adults.",
      rating: 4.6,
      reviewCount: 63,
      monthlyFee: 4400,
      feeLabel: "₹4,400 / month",
      priceTier: "mid",
      batchTimings: [
        "Mon-Sat • 7:00 AM - 8:00 AM",
        "Mon-Fri • 7:00 PM - 8:30 PM"
      ],
      coaches: [
        {
          name: "Faiz Khan",
          specialty: "Foundational boxing technique",
          experience: "National circuit • 10 years"
        },
        {
          name: "Sonal Raj",
          specialty: "Conditioning and confidence",
          experience: "Box fit coach • 6 years"
        }
      ],
      facilities: ["Ring zone", "Conditioning bay", "Bag wall", "Locker room"],
      images: ["assets/academy-fitness-1.svg", "assets/academy-court-1.svg"],
      contact: {
        phone: "+91 98664 20110",
        email: "team@ironpulse.fit",
        whatsapp: "+919866420110",
        website: "https://coachnestly.app/demo/ironpulse-boxing-loft",
        mapQuery: "IronPulse Boxing Loft Madhapur Hyderabad"
      },
      coordinates: { lat: 17.4498, lng: 78.3915 },
      mapPosition: { x: 59, y: 69 },
      featured: false,
      topRated: false,
      trending: false,
      ageGroups: ["15-18", "adult"],
      goals: ["fitness", "competitive", "beginner"],
      idealFor:
        "Older students and adults who want a disciplined solo sport with strong conditioning benefits and coach attention.",
      badges: ["Technique first", "Small batch size"]
    },
    {
      id: "skyserve-volleyball-club",
      name: "SkyServe Volleyball Club",
      sport: "Volleyball",
      city: "Bengaluru",
      area: "Whitefield",
      locationLabel: "Whitefield, Bengaluru",
      description:
        "Volleyball coaching for school teams and confident beginners, combining agility, coordination, and tactical movement.",
      rating: 4.4,
      reviewCount: 44,
      monthlyFee: 3300,
      feeLabel: "₹3,300 / month",
      priceTier: "value",
      batchTimings: [
        "Tue-Thu-Sat • 6:15 AM - 7:30 AM",
        "Mon-Wed-Fri • 5:00 PM - 6:30 PM"
      ],
      coaches: [
        {
          name: "Jenil Abraham",
          specialty: "School volleyball systems",
          experience: "League coach • 8 years"
        },
        {
          name: "Priya Nair",
          specialty: "Jump mechanics",
          experience: "Athletic development • 5 years"
        }
      ],
      facilities: ["Outdoor court", "Serve wall", "Mobility corner", "Parent zone"],
      images: ["assets/academy-court-1.svg", "assets/academy-football-1.svg"],
      contact: {
        phone: "+91 99011 30774",
        email: "play@skyserveclub.in",
        whatsapp: "+919901130774",
        website: "https://coachnestly.app/demo/skyserve-volleyball-club",
        mapQuery: "SkyServe Volleyball Club Whitefield Bengaluru"
      },
      coordinates: { lat: 12.9698, lng: 77.7499 },
      mapPosition: { x: 73, y: 48 },
      featured: false,
      topRated: false,
      trending: true,
      ageGroups: ["11-14", "15-18"],
      goals: ["beginner", "fitness", "competitive"],
      idealFor:
        "Athletes who enjoy team movement, quick progressions, and a sport that builds confidence through repetition and match play.",
      badges: ["School team prep", "Weekend clinics"]
    }
  ]
};
