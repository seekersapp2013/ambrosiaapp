now i need you o find or create the components for these screens and implement them. 

1. Splash Screen: it should be a combination of bg and logo. Ensure logo is center aligned on the bg
2. Onaboarding: this is the screen that should be shown to a first time user with a skip button. It should show after the splash screen and before the Login / Sign Up
3. Login Screen: update this login screen to look like this one. Ensure to the inputs will match what the backend screen expects
4. Sign Up Screens: this is the a cominbation of screens if follows what we already have just chaning the color and look but the individual and the Porivider approach still reamins the same ensure it stays that way
5. For You. Remove the AI and For. And ensure that the AI version is what we will be using going forward.

I have added these screens to C:\Users\PC\Documents\ambrosiaapp\app\assets\images



npm install @expo-google-fonts/roboto --save --legacy-peer-deps



1. I have added images like logo=white, onboardingbg(s), loginbg(s) to C:\Users\PC\Documents\ambrosiaapp\app\assets\images plwase use these were approapriate according to the images. For the confirm password and google login please ignore them. 
2. a remove the toggle and make the render ai only
3. i have added user.png and provider.png to C:\Users\PC\Documents\ambrosiaapp\app\assets\images you just need to replace the current ones with those images and make them clickable to the eact same component the current one is linked to. 


npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "onboarding|Password|SignUpRoleSelector|for-you|ai\.tsx" | Select-Object -First 40


pnpm install --frozen-lockfile