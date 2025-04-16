/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import fs from 'mz/fs';
import path from 'path';
import * as borsh from 'borsh';

import {getPayer, getRpcUrl, createKeypairFromFile} from './utils'; // Assuming utils.ts is correct

/**
 * Connection to the network
 */
let connection: Connection;

/**
 * Keypair associated to the fees' payer
 */
let payer: Keypair;

/**
 * Hello world's program id - THIS SHOULD BE SET EXTERNALLY (e.g., by main.ts)
 */
export let programId: PublicKey; // Exporting allows main.ts to set it

/**
 * The public key of the account we are saying hello to
 */
let greetedPubkey: PublicKey;

/**
 * Path to program files (ALTHOUGH NOT USED FOR KEYPAIR ANYMORE)
 */
const PROGRAM_PATH = path.resolve(__dirname, '../../dist/program');

/**
 * Path to program shared object file (REFERENCE ONLY - NOT USED BY CLIENT LOGIC)
 */
const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, 'helloworld.so');

/**
 * Path to the keypair of the deployed program (REFERENCE ONLY - NOT USED BY CLIENT LOGIC)
 */
const PROGRAM_KEYPAIR_PATH = path.join(PROGRAM_PATH, 'helloworld-keypair.json');


// --- Setter function for Program ID ---
// main.ts should call this function after getting the ID from command line args
export function setProgramId(id: PublicKey) {
  programId = id;
  console.log(`Using program ID set externally: ${programId.toBase58()}`);
}
// --- End Setter function ---


/**
* The state of a greeting account managed by the hello world program
 */
class GreetingAccount {
  counter = 0;
  constructor(fields: {counter: number} | undefined = undefined) {
    if (fields) {
      this.counter = fields.counter;
    }
  }
}

/**
 * Borsh schema definition for greeting accounts
 */
const GreetingSchema = new Map([
  [GreetingAccount, {kind: 'struct', fields: [['counter', 'u32']]}],
]);

/**
 * The expected size of each greeting account.
*/
const GREETING_SIZE = borsh.serialize(
  GreetingSchema,
  new GreetingAccount(),
).length;

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(): Promise<void> {
  const rpcUrl = await getRpcUrl(); // Assumes getRpcUrl from utils works
  connection = new Connection(rpcUrl, 'confirmed');
  const version = await connection.getVersion();
  console.log('Connection to cluster established:', rpcUrl, version);
}

/**
 * Establish an account to pay for everything
 */
export async function establishPayer(): Promise<void> {
  let fees = 0;
  if (!payer) {
    const {feeCalculator} = await connection.getRecentBlockhash();

    // Calculate the cost to fund the greeter account
    fees += await connection.getMinimumBalanceForRentExemption(GREETING_SIZE);

    // Calculate the cost of sending transactions (rough estimate)
    //fees += feeCalculator.lamportsPerSignature * 100; // Adjust if needed
    fees += 50000 // Alternative fixed fee estimate

    payer = await getPayer(); // Assumes getPayer from utils works
  }

  let lamports = await connection.getBalance(payer.publicKey);
  if (lamports < fees) {
    // If current balance is not enough to pay for fees, request an airdrop
    console.log(`Requesting airdrop for ${fees - lamports} lamports...`);
    const sig = await connection.requestAirdrop(
      payer.publicKey,
      fees - lamports,
   );
    // await connection.confirmTransaction(sig); // Standard confirmation
    // Using confirmTransaction with commitment and blockhash for potentially faster confirmation
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        signature: sig,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight
      }, 'confirmed');

    lamports = await connection.getBalance(payer.publicKey);
    console.log(`Airdrop successful. New balance: ${lamports / LAMPORTS_PER_SOL} SOL`);
  }

  console.log(
    'Using account',
    payer.publicKey.toBase58(),
    'containing',
    lamports / LAMPORTS_PER_SOL,
    'SOL to pay for fees',
  );
}

/**
 * Check if the hello world BPF program has been deployed
 * ASSUMES `programId` has been set externally via `setProgramId`
 */
export async function checkProgram(): Promise<void> {

  // Check if programId was set
  if (!programId) {
    throw new Error('Program ID has not been set. Ensure main.ts calls setProgramId.');
  }

  // Check if the program has been deployed at the provided programId
  console.log(`Checking deployment of program ${programId.toBase58()}...`);
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo === null) {
      // Removed check for PROGRAM_SO_PATH as it's irrelevant to whether the program *at the given ID* is deployed
      throw new Error(`Program with ID ${programId.toBase58()} has not been deployed or the ID is incorrect.`);
  } else if (!programInfo.executable) {
    throw new Error(`Program with ID ${programId.toBase58()} is not executable`);
  }
  console.log(`Successfully found executable program ${programId.toBase58()}`);

  // Derive the address (public key) of a greeting account from the program ID + payer public key
  const GREETING_SEED = 'hello'; // Seed used by the program to create the account
  greetedPubkey = await PublicKey.createWithSeed(
    payer.publicKey,
    GREETING_SEED,
    programId,
  );

  // Check if the greeting account has already been created
  const greetedAccount = await connection.getAccountInfo(greetedPubkey);
  if (greetedAccount === null) {
    console.log(
      'Greeting account does not exist. Creating account:',
      greetedPubkey.toBase58(),
   );
    const lamports = await connection.getMinimumBalanceForRentExemption(
      GREETING_SIZE,
    );

    const transaction = new Transaction().add(
      SystemProgram.createAccountWithSeed({
        fromPubkey: payer.publicKey,
        basePubkey: payer.publicKey,
        seed: GREETING_SEED,
        newAccountPubkey: greetedPubkey,
        lamports,
        space: GREETING_SIZE,
        programId, // The program that owns the account
      }),
    );
    console.log('Sending transaction to create greeting account...');
    const txSignature = await sendAndConfirmTransaction(connection, transaction, [payer]);
    console.log(`Transaction successful with signature: ${txSignature}`);
  } else {
    console.log('Found existing greeting account:', greetedPubkey.toBase58());
  }
}

/**
 * Say hello (send transaction to the program)
 */
export async function sayHello(): Promise<void> {
  if (!greetedPubkey) {
    throw new Error("Greeting account public key is not set. Run checkProgram first.");
  }
  console.log('Saying hello to account:', greetedPubkey.toBase58());
  const instruction = new TransactionInstruction({
    keys: [{pubkey: greetedPubkey, isSigner: false, isWritable: true}], // The account to modify
    programId, // The program to execute
    data: Buffer.alloc(0), // No instruction data needed for simple "hello"
  });
  console.log('Sending hello transaction...');
  const txSignature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer], // Payer signs the transaction
  );
  console.log(`Transaction successful with signature: ${txSignature}`);
}

/**
 * Report the number of times the greeted account has been said hello to
 */
export async function reportGreetings(): Promise<void> {
  if (!greetedPubkey) {
    throw new Error("Greeting account public key is not set. Run checkProgram first.");
  }
  const accountInfo = await connection.getAccountInfo(greetedPubkey);
  if (accountInfo === null) {
    throw 'Error: cannot find the greeted account';
  }
  // Deserialize the account data
  const greeting = borsh.deserialize(
    GreetingSchema,
    GreetingAccount,
    accountInfo.data,
  );
  console.log(
    `Account ${greetedPubkey.toBase58()} has been greeted ${greeting.counter} time(s)`,
  );
}
