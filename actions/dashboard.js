"user server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const serializTransaction = (obj) =>{
    const serialized = {...obj};

    if(obj.balance)
    {
        serialized.balance = obj.balance.toNumber();
    }
}

export async function createAccount(data) {
  try {
    const { userId } = await auth();

    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findunique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    //convert balance to float before saving

    const balanceFloat = parseFloat(data.balance);

    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance amount");
    }

    //check if this is the user's first account

    const existiingAccounts = await db.account.findMany({
      where: { userId: user.id },
    });

    const shouldBeDefault =
      existiingAccounts.length === 0 ? true : data.isDefault;


      // if this account should be default, unset other default accounts
    if (shouldBeDefault) {
      await db.account.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await db.account.create({
        data:{
            ...data,
            balance:balanceFloat,
            userId: user.id,
            isDefault: shouldBeDefault,
        },
    });


    const serializedAccount = serializTransaction(account);

    revalidatePath("/dashboard");

    return {success:true, data:serializedAccount};


  } catch (error) {}
}
