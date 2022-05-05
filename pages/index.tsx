import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/initSupabase'
import { Airdrop } from '../models/airdrop';
import React from 'react';

interface IFormInput {
  pubKey: PublicKey
}

const Home: NextPage = () => {

  const {
    register,
    handleSubmit,
    reset
  } = useForm<IFormInput>()

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const SUPABASE_TABLE_NAME: string = 'airdrop';
  const [limit, setLimit] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  function Spinner() {
    return (

      <svg role="status" className="w-8 h-8 mr-2 text-gray-100 animate-spin dark:text-gray-300 fill-violet-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"></path>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"></path>
      </svg>

    )
  }

  async function onSubmit(data: any) {
    try {
      let publicKey = new PublicKey(data.pubKey);

      const dbData = await supabase.
        from(SUPABASE_TABLE_NAME)
        .select('*')
        .eq('public_key', publicKey.toString())
        .maybeSingle();

      if (dbData.data === null) {
        setIsLoading(true);
        let airdropSignature = await connection.requestAirdrop(
          publicKey,
          LAMPORTS_PER_SOL * 2
        )
        await connection.confirmTransaction(airdropSignature);
        let airdrop = new Airdrop(publicKey.toString());
        await supabase
          .from(SUPABASE_TABLE_NAME)
          .insert(airdrop)
          .single();
        setIsLoading(false);
      }
      else {
        let hours = Math.round(Math.abs(new Date().getTime() - new Date(dbData.data.updated_at).getTime()) / 36e5);
        if (hours > 8) {
          setIsLoading(true)
          let airdropSignature = await connection.requestAirdrop(
            publicKey,
            LAMPORTS_PER_SOL * 2
          )
          await connection.confirmTransaction(airdropSignature);
          await supabase
            .from(SUPABASE_TABLE_NAME)
            .update({ updated_at: new Date().toISOString() })
            .match({ public_key: publicKey })
            .single();
          setIsLoading(false);
        }
        else {
          setLimit('Reached limit.');
        }
      }
      reset({ pubKey: '' })
    }
    catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <Head>
        <title>Solfaucet</title>
        <meta name="description" content="solana devnet airdropping application" />
      </Head>
      <main>
        <div className='flex flex-col w-full items-center'>
          <h1 className='text-3xl font-bold underline mt-20  m-4 mx-auto text-violet-700 hover:text-violet-800'>Solana Devnet Faucet</h1>
          <h4 className='text-xl font-bold'>Paste your wallet address to get SOL airdrop</h4>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="my-10 mb-10 mx-auto w-1/2 flex flex-col space-y-1"
          >
            <input
              {...register('pubKey', { required: true })}
              className="form-input mt-1 mb-4 rounded border py-2 px-3 shadow outline-none ring-violet-500 focus:ring-2"
              placeholder="Wallet Address"
              type="text"
            />
            <input
              type="submit"
              className="focus:shadow-outline rounded cursor-pointer bg-violet-500 py-2 px-4font-bold text-white shadow hover:bg-violet-600 focus:outline-none"
            />
          </form>
          {isLoading && Spinner()}
          {limit && (<p className='text-red-500 font-semibold'>{limit}</p>)}
        </div>
      </main>
      <footer className='text-md font-bold flex flex-col items-center'>
        <div className='border-1 shadow-md m-5 p-5 px-10'>
          <p>Inspired by <a className='underline text-gray-700' href='https://faucet.rinkeby.io/'>Faucet.Rinkeby</a></p>
          <p>Only 2 SOL per 8 hours.</p>
        </div>
      </footer>
    </div>
  )
}

export default Home
