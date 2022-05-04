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

  async function onSubmit(data: any) {
    try {
      let publicKey = new PublicKey(data.pubKey);

      const dbData = await supabase.
        from(SUPABASE_TABLE_NAME)
        .select('*')
        .eq('public_key', publicKey.toString())
        .maybeSingle();

      if (dbData.data === null) {
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
      }
      else {
        let hours = Math.round(Math.abs(new Date().getTime() - new Date(dbData.data.updated_at).getTime()) / 36e5);
        if (hours > 8) {
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
        }
        else {
          console.log("Reached limit.")
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
