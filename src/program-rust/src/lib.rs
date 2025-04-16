#[cfg(test)]
mod test {
    use solana_program_test::*;
    use solana_sdk::{
        instruction::Instruction, pubkey::Pubkey, signature::Signer, transaction::Transaction,
    };

    #[tokio::test]
    async fn test_hello_world() {
        let program_id = Pubkey::new_unique();
        let mut program_test = ProgramTest::default();
        program_test.add_program("hello_world", program_id, None);
        let (mut banks_client, payer, recent_blockhash) = program_test.start().await;
        // Create instruction
        let instruction = Instruction {
            program_id,
            accounts: vec![],
            data: vec![],
        };
        // Create transaction with instruction
        let mut transaction = Transaction::new_with_payer(&[instruction], Some(&payer.pubkey()));

        // Sign transaction
        transaction.sign(&[&payer], recent_blockhash);

        let transaction_result = banks_client.process_transaction(transaction).await;
        assert!(transaction_result.is_ok());
    }
}
