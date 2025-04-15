# Solana Hello World Deployment - Assignment Guide

This README outlines the steps taken to set up the Solana environment, build the example "Hello World" Rust program, and deploy it to the Solana Devnet.

## Usage

Follow these instructions to replicate the setup and deployment process.

**1. Prerequisites:**

*   **Install Solana CLI:**
    *   Follow the official guide: [https://solana.com/docs/intro/installation](https://solana.com/docs/intro/installation)
    *   Verify installation: `solana --version`
    *(You should see output indicating the `solana-cli` version installed).*

*   **Install Rust and Cargo:**
    *   Run the installation script:
        ```bash
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
        ```
    *   Follow the on-screen prompts (usually option 1 is fine).
    *   Configure your current shell session:
        ```bash
        source "$HOME/.cargo/env"
        ```
    *   Verify installation:
        ```bash
        rustc --version
        cargo --version
        ```

*   **Install Git:**
    *   Ensure Git is installed (e.g., `sudo apt update && sudo apt install git` on Ubuntu/Debian).

**2. Get Project Code:**

*   Clone this repository (which includes necessary dependency updates):
    ```bash
    git clone https://github.com/Nurik016/bc2.git
    cd bc2
    ```

**3. Configure Solana CLI and Wallet:**

*   **Set Network to Devnet:**
    ```bash
    solana config set --url https://api.devnet.solana.com
    ```
*   **Verify Configuration:**
    ```bash
    solana config get
    ```
*   **Generate Wallet Keypair (if needed):**
    ```bash
    # IMPORTANT: Backup the generated seed phrase securely!
    solana-keygen new --outfile ~/.config/solana/id.json
    ```
*   **Check Wallet Address:**
    ```bash
    solana address
    ```
*   **Get Devnet SOL:** (Needed to pay transaction/deployment fees)
    ```bash
    solana airdrop 1 # Request 1 SOL (may need 2)
    ```
*   **Check Balance:**
    ```bash
    solana balance
    ```

**4. Build the Solana Program:**

*   **Navigate to Program Directory:**
    ```bash
    cd src/program-rust
    ```
*   **Build the Program (using SBF target):**
    ```bash
    # Note: Use build-sbf, not build-bpf, for newer Solana versions
    cargo build-sbf
    ```
    *This compiles the Rust code into `target/deploy/helloworld.so`.*

**5. Deploy the Program:**

*   **Deploy to Devnet:** (Ensure you are still in `src/program-rust`)
    ```bash
    solana program deploy target/deploy/helloworld.so
    ```
*   **Note the Output:** Copy the **Program ID** from the command output. This is the address of your deployed program.

**6. Verify Deployment Cost (Optional):**

*   You can check how much SOL the deployment cost:
    ```bash
    solana balance ~/.config/solana/id.json
    ```
    *(Compare this to the balance before deployment).*

## Demo Screenshot

![Deployment Proof](img/Screenshot%20from%202025-04-14%2000-07-52.png)
![Deployment Proof](img/Screenshot%20from%202025-04-14%2000-06-33.png)
![Deployment Proof](img/Screenshot%20from%202025-04-14%2000-07-22.png)


## Examples

The deployed program is simple:
*   It logs "Hello, World!" to the transaction output.
*   It keeps track of how many times it has been called by an account.

To interact with it, you would use Solana SDKs (like `@solana/web3.js`) in a separate application to send transactions to the **Program ID** you obtained during deployment.

---

That's all! You have successfully set up, built, and deployed the program.
