'use server';

import { z } from "zod";
import { date } from "zod/v4";
import { id } from "zod/v4/locales";
import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { redirect } from 'next/navigation';
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type State = {
  errors?: {
    customerId?: string;
    amount?: string;
    status?: string;
  };
  message?: string | null;
  fields?: {
    customerId?: string;
    amount?: string;
    status?: string;
  };
}

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
const formSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce.number().gt(0, 'Amount must be greater than 0.'),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

const CreateInvoice = formSchema.omit({ id: true, date: true });
const UpdateInvoice = formSchema.omit({ id:true, date: true });


export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
      console.log(validatedFields);
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
        fields: {
          customerId: formData.get('customerId')?.toString() ?? '',
          amount: formData.get('amount')?.toString() ?? '',
          status: formData.get('status')?.toString() ?? '',
        },
      };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
      await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    }catch (error) {
      console.error(error);
      return {
        message: 'Database Error: Failed to Create Invoice.',
      };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoice(prevState: State, id: string, formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
      console.log(validatedFields);
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
        fields: {
          customerId: formData.get('customerId')?.toString() ?? '',
          amount: formData.get('amount')?.toString() ?? '',
          status: formData.get('status')?.toString() ?? '',
        },
      };
    }

    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;

    try{
      await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
    }catch (error) {
      console.error(error);
      return {
        message: 'Database Error: Failed to Update Invoice.',
      };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    throw new Error('Failed to Delete Invoice');
    
    await sql`
      DELETE FROM invoices
      WHERE id = ${id}
    `;

    revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string|undefined,
  formData: FormData
){
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return "invalid credentials";
        default:
          return "something went wrong";
      }
    }
    throw error;
  }
}