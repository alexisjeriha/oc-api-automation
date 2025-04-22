# Playwright OC API Automation
Check [Official Playwright Documentation](https://playwright.dev/docs/intro) for more details.
## Prerequisites

- **Node.js:** Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).
    
- **npm or yarn:** npm comes bundled with Node.js. Alternatively, you can use yarn.
    

## Cloning the Repository

Clone the repository using the following command:

```bash
git clone https://github.com/alexisjeriha/oc-api-automation.git
```


## Installing Dependencies

Once you are in the project directory, install the Node.js dependencies:

```bash
npm install
```

## Installing Playwright

```bash
npm init playwright@latest
```

## Running Tests

You should be able to run the tests with:
```bash
npx playwright test --project=chromium
```

But I suggest to download Playwright extension on VSCode
![image](https://github.com/user-attachments/assets/47e33707-8e1c-4f25-81e2-7c4e1d248c22)

## Accessing Report
```bash
npx playwright show-report
```

## Project Structure

- **tests/**: Contains the test files.
    
- **package.json**: Contains project configuration and dependencies.
    
- **playwright.config.js**: Configuration file for the Playwright test runner.
    
