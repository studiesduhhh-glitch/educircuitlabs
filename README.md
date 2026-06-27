# Educircuit

## Video Demo

#website : educircuitlabs.com

**URL:** https://youtu.be/5_uD6pUBvkw

## Description

## Description

Educircuit is my CS50 Final Project, an AI-powered interactive web application designed to improve the way students learn electronics and circuit design. The primary objective of this project is to make electronics education more engaging, interactive, and accessible by combining modern web technologies with artificial intelligence. Traditional methods of learning electronics often depend heavily on textbooks, static diagrams, and classroom lectures. While these methods are valuable, they can make it difficult for students to visualize concepts or experiment with ideas. Educircuit was created to bridge that gap by providing an interactive platform where students can learn, explore, and manage their learning journey in one place.

The inspiration for this project came from observing how many students struggle with electronics because they rarely get opportunities to experiment outside the classroom. Practical learning is one of the most effective ways to understand engineering concepts, but access to expensive laboratory equipment is not always possible. I wanted to build a platform that could encourage curiosity, improve understanding, and make learning more enjoyable. Rather than simply presenting information, Educircuit focuses on providing an environment where students can interact with educational content while receiving guidance from an AI assistant.

One of the main features of Educircuit is its AI-powered educational assistant. Instead of forcing students to search through multiple resources when they become confused, the AI assistant provides guidance, explanations, and learning support directly within the application. The goal is not to replace teachers but to act as a digital learning companion that helps students understand difficult concepts, answer common questions, and encourage independent learning. This makes the platform more interactive than a traditional educational website.

The application also provides secure user authentication through Firebase Authentication. This allows students and teachers to create accounts, sign in securely, and access personalized dashboards. Authentication ensures that each user's information remains separate and allows future expansion of the platform with additional personalized features. Firebase was chosen because it provides reliable authentication, integrates well with web applications, and eliminates the need to build a custom authentication backend.

Cloud Firestore is used as the primary database for storing user information, projects, and other application data. Using a cloud database allows information to remain synchronized and easily accessible while keeping the application scalable. Instead of storing information locally inside the browser, user data can be saved securely and retrieved whenever the user logs back into the application.

The user interface was designed with simplicity and usability as major priorities. Throughout development, I tried to create an interface that would be comfortable for beginners while still providing useful functionality for more experienced users. Clear navigation, organized layouts, responsive components, and consistent styling help users focus on learning instead of struggling to understand the interface itself. Responsive web design was also an important consideration so that the application works across different screen sizes including desktops, laptops, and mobile devices.

From a software engineering perspective, Educircuit follows a modular project structure. Instead of placing all functionality inside a single JavaScript file, different responsibilities are separated into multiple modules. Authentication, runtime management, application state, user interface components, project services, and AI functionality are organized into separate files. This makes the project easier to maintain, easier to debug, and easier to extend in the future. Modular organization also reflects good software development practices that I learned throughout CS50.

The frontend of the application is built using HTML5, CSS3, and modern JavaScript. HTML provides the overall structure of the application, CSS is responsible for styling and responsive layouts, and JavaScript controls the application's dynamic behavior. Throughout development I applied concepts learned in CS50 regarding programming logic, debugging, code organization, modularity, and problem solving. Git and GitHub were used for version control, allowing changes to be tracked throughout the development process.

One of the biggest technical challenges during development was integrating multiple independent features into a single application while maintaining stability. Authentication, cloud database operations, AI integration, user interface interactions, and project management all needed to work together correctly. Debugging asynchronous JavaScript code and ensuring proper communication between components required careful testing and multiple iterations. I also spent considerable time improving responsiveness, fixing layout issues, and ensuring that the application behaved consistently across different devices.

Another challenge involved organizing the project as it grew larger. As new features were added, keeping the codebase clean became increasingly important. Refactoring modules, improving file organization, and separating responsibilities into reusable components helped improve maintainability. Testing became equally important, and I continuously reviewed and improved the application to eliminate bugs and improve reliability before final submission.

Artificial intelligence also played a role during development. I used AI as a programming assistant to help explain concepts, debug issues, review code quality, and improve development efficiency. However, I remained responsible for designing the application, integrating its components, understanding how the code works, testing functionality, and making final implementation decisions. Using AI as a learning and development tool reflects the modern software development workflow used by many developers today.

If I continue developing Educircuit after CS50, I have several ideas for future improvements. I would like to expand the number of interactive electronics lessons, improve circuit simulations, introduce additional AI-powered educational tools, provide more detailed teacher analytics, support collaborative student projects, and eventually develop dedicated Android and iOS applications. I also hope to integrate additional educational resources that make the platform useful for schools and self-learners alike.

Working on Educircuit has been one of the most valuable learning experiences of my CS50 journey. Building a complete web application required me to combine concepts from programming, web development, databases, authentication, debugging, software architecture, testing, and version control. Beyond technical skills, this project taught me how to approach large software projects by dividing complex problems into manageable parts, iterating through improvements, and continuously refining the final product. Educircuit represents not only the completion of my CS50 Final Project but also the knowledge and confidence I gained throughout the course while building a real-world application from the ground up.


## Features

* Interactive electronics learning platform
* AI-powered educational assistant
* Firebase Authentication
* Cloud Firestore database
* Student dashboard
* Teacher dashboard
* Project management
* Responsive design for desktop and mobile
* Secure data storage
* Modern user interface

## Technologies Used

* HTML5
* CSS3
* JavaScript (ES6)
* Firebase Authentication
* Cloud Firestore
* Vite
* Git & GitHub

## Project Structure

* `index.html` – Main application entry point.
* `src/` – Core application logic and modules.
* `styles/` – Styling files.
* `tests/` – Automated tests.
* `docs/` – Project documentation.
* `main.js` – Initializes the application.
* Other JavaScript modules manage authentication, dashboards, AI functionality, simulations, and project services.

## Design Decisions

I designed Educircuit to be modular so that each feature is separated into its own JavaScript module. Firebase was selected because it provides reliable authentication and cloud database services without requiring a dedicated backend server.

The user interface was designed to be clean, responsive, and easy for beginners to navigate. Throughout development, I focused on maintainability, responsiveness, and usability.

## Challenges

The most challenging parts of this project included integrating Firebase services, organizing the project into reusable modules, debugging application logic, improving responsiveness, and ensuring that different components worked together smoothly.

Testing and refining the application required multiple iterations to improve both performance and user experience.

## Future Improvements

* More advanced circuit simulations
* Additional AI-powered educational tools
* Analytics for teachers
* Real-time collaboration
* Native Android and iOS applications
* More interactive learning modules

## What I Learned

Building Educircuit allowed me to apply many concepts learned throughout CS50, including programming fundamentals, web development, debugging, project organization, version control, and software design. This project significantly improved my confidence in building complete web applications.

## Acknowledgements

I would like to thank Harvard's CS50 team for creating an outstanding course that helped me develop the skills necessary to build this project.
