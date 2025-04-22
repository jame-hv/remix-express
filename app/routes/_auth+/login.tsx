import { useActionData } from "@remix-run/react";

import { json } from "@remix-run/node";
import { z } from "zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { PasswordSchema, UsernameSchema } from "~/modules/auth/validator";
import { requireAnonymous } from "~/modules/auth/auth.server";

// schema define

const LoginFormSchema = z.object({
  username: UsernameSchema,
  password: PasswordSchema,
  redirectTo: z.string().optional(),
  remember: z.boolean().optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAnonymous(request);

  return json({ success: true });
}

const LoginPage = () => {
  const actionData = useActionData<typeof action>();
  return <div></div>;
};

export default LoginPage;
