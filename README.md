[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/Uq-6GvbM)
The team project for this class is designed to mirror the experiences of a software engineer: by virtue of your individual projects, you have been _onboarded_ to our codebase, made several individual contributions, and have formed a team to propose, develop and implement new features. The codebase that we’ll be developing on is a PancakeOverflow project. You will get an opportunity to work with the starter code which provides basic skeleton for the app and then additional features will be proposed and implemented by you! All implementation will take place in the TypeScript programming language, using React for the user interface.

## Getting Started

Run `npm install` in the root directory to install all dependencies for the `client`, `server`, and `shared` folders.

Run `cd client` and `npm install @fortawesome/react-fontawesome @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons`

Seed the database with `cd server` `npm run delete-db` `npm run populate-db` 

> [!NOTE]
> Refer to [IP1](https://neu-se.github.io/CS4530-Spring-2025/assignments/ip1) and [IP2](https://neu-se.github.io/CS4530-Spring-2025/assignments/ip2) for further instructions related to setting up MongoDB, setting environment variables, and running the client and server.

## Codebase Folder Structure

- `client`: Contains the frontend application code, responsible for the user interface and interacting with the backend. This directory includes all React components and related assets.
- `server`: Contains the backend application code, handling the logic, APIs, and database interactions. It serves requests from the client and processes data accordingly.
- `shared`: Contains all shared type definitions that are used by both the client and server. This helps maintain consistency and reduces duplication of code between the two folders. The type definitions are imported and shared within each folder's `types/types.ts` file.

### Setup Instructions

1. Navigate to the `testing` directory:
   ```sh
   cd testing
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Refer to the atached .zip file for .env details and where to store them

4. Make sure that both the server and client are already running

5. Run Cypress tests:
   ```sh
   npx cypress open
   ```

6. In the Cypress UI that opens:
   - Select *E2E Testing*
   - Choose your browser (Chrome is preferred)
   - Click on any of the test files to run it
   - If any of the tests fail, you should be able to see the exact sequence of steps that led to the failure.

