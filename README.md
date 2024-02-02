# Project_SIO_2

### About the project
This project is focused on the implementation of robust authentication protocols, consisting of two distinct applications, both implementing a challenge-response authentication protocol:
* Web application that allows users to register, login and perform several actions such as comment and star review different movies
* User Authentication Application (UAP) that allows users to generate a single authentication key and then associate multiple credentials of different service DNS names to that key

Through this mechanism, users can authenticate within the web application by being redirected to the UAP, entering their personal authentication key, and subsequently returning to the web application with an active session

### Detailed description/usage
#### 1. Setup:
  1. Go inside the [app_auth](app_auth) folder and follow the [howToRun.txt](app_auth/howToRun.txt)
  2. Go inside the [uap_server](uap_server) folder and follow the [howToRun.txt](uap_server/howToRun.txt)
  3. Go inside the [uap](uap) folder and follow the [howToRun.txt](uap/howToRun.txt)
#### 2. Test:
  1. Register an account in the Web Application (Movie Review Website)
2. Open the UAP client interface, generate Authentication Key and then:
   1. Login using the Authentication Key
   2. Link the account credentials that you registered yourself with in the Movie Review Website
3. Log in the Movie Review Website by choosing "Authenticate with UAP"
   - You will be redirected to an UAP endpoint and asked to enter your Authentication Key
   - The implemented Challenge-Response Authentication Protocol will then be ran and:
      - If successful, you will be redirected to the Movie Review Website and automatically logged in
      - If not successful, you will be presented with a failure message
