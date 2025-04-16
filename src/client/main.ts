/**
 * Hello world client example
 */

import {
  establishConnection,
  establishPayer,
  checkProgram,
  sayHello,
  reportGreetings,
  setProgramId,
} from './hello_world';
import { PublicKey } from '@solana/web3.js'; // <--- Import PublicKey

async function main() {
  console.log("Let's say hello to a Solana account...");

  // --- Get Program ID from command line arguments ---
  if (process.argv.length < 3) {
    console.error("Error: Please provide the Program ID as a command line argument.");
    process.exit(1); // Exit if no argument is provided
  }
  const programIdString = process.argv[2]; // Get the third element (index 2) which should be the Program ID
  let programIdPublicKey: PublicKey;
  try {
    // Attempt to create a PublicKey object from the string argument
    programIdPublicKey = new PublicKey(programIdString);
  } catch (err) {
    // Catch errors if the provided string is not a valid public key format
    console.error(`Error: Invalid Program ID provided: ${programIdString}`);
    process.exit(1); // Exit if the ID is invalid
  }
  // --- End Get Program ID ---


  // Establish connection to the cluster
  await establishConnection();

  // Determine who pays for the fees (loads payer keypair and requests airdrop if needed)
  await establishPayer();

  // --- Set the Program ID for the hello_world module ---
  // This makes the programId available within the hello_world.ts functions
  setProgramId(programIdPublicKey); // <--- CALL THE SETTER HERE, passing the validated PublicKey
  // --- End Set Program ID ---

  // Check if the program has been deployed at the specified Program ID
  // This will also create the greeting account if it doesn't exist
  await checkProgram();

  // Send a transaction to the program to increment the counter
  await sayHello();

  // Query the greeting account and report the current counter value
  await reportGreetings();

  console.log('Success');
}

// Standard pattern to run the async main function and handle errors
main().then(
  () => process.exit(0), // Exit with success code 0
  err => {
    console.error(err); // Log any errors that occurred
    process.exit(1); // Exit with error code 1
  },
);
