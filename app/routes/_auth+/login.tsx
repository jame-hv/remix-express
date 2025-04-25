import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
  data,
  Form,
  Link,
  useActionData,
  useSearchParams,
} from "@remix-run/react";
import { z } from "zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { PasswordSchema, UsernameSchema } from "~/modules/auth/validator";
import { login, requireAnonymous } from "~/modules/auth/auth.server";
import { CheckboxField, ErrorList, Field } from "~/components/forms";
import { Button } from "~/components/ui/button";
import { handleNewSession } from "~/modules/auth/login.server";

// Schema define
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
  const formData = await request.formData();

  const submission = await parseWithZod(formData, {
    schema: (intent) =>
      LoginFormSchema.transform(async (data, context) => {
        if (intent !== null) {
          return { ...data, session: null };
        }
        const session = await login(data);

        if (!session) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid username or password",
          });
          return z.NEVER;
        }
        return { ...data, session };
      }),
    async: true,
  });

  if (submission.status !== "success" || !submission.value?.session) {
    return data(
      { result: submission.reply({ hideFields: ["password"] }) },
      { status: submission.status === "error" ? 400 : 200 }
    );
  }

  const { session, remember, redirectTo } = submission.value;

  return handleNewSession({
    request,
    session,
    remember: remember ?? false,
    redirectTo,
  });
}

const LoginRoute = () => {
  const actionData = useActionData<typeof action>();

  console.log(actionData);

  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  // login form

  const [form, fields] = useForm({
    id: "login-form",
    constraint: getZodConstraint(LoginFormSchema),
    defaultValue: { redirectTo },
    lastResult:
      actionData && "result" in actionData ? actionData.result : undefined,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: LoginFormSchema });
    },
    shouldRevalidate: "onBlur",
  });

  return (
    <div className="mx-auto flex h-full w-full max-w-96 flex-col items-center justify-center gap-6">
      <div className="mb-2 flex flex-col gap-2">
        <h1 className="text-center text-2xl font-medium text-primary">
          Welcome to our app !
        </h1>
        <p className="text-center text-base font-normal text-primary/60">
          Please log in to continue.
        </p>
      </div>
      <div className="mx-auto w-full max-w-md px-8">
        <Form method="POST" {...getFormProps(form)}>
          <Field
            labelProps={{ children: "Username" }}
            inputProps={{
              ...getInputProps(fields.username, { type: "text" }),
              autoFocus: true,
              className: "lowercase",
              autoComplete: "username",
            }}
            errors={fields.username.errors}
          />
          <Field
            labelProps={{ children: "Password" }}
            inputProps={{
              ...getInputProps(fields.password, {
                type: "password",
              }),
              autoComplete: "current-password",
            }}
            errors={fields.password.errors}
          />

          <div className="flex-col justify-between ">
            <CheckboxField
              labelProps={{
                htmlFor: fields.remember.id,
                children: "Remember me",
              }}
              buttonProps={getInputProps(fields.remember, {
                type: "checkbox",
              })}
              errors={fields.remember.errors}
            />

            <div className="">
              <Link
                to="/register"
                className="text-sm underline hover:text-blue-500"
              >
                Not a member? Sign up
              </Link>
            </div>
          </div>

          <input {...getInputProps(fields.redirectTo, { type: "hidden" })} />
          <ErrorList errors={form.errors} id={form.errorId} />

          <div className="flex items-center justify-between gap-6 pt-3">
            <Button className="w-full" type="submit">
              Log in
            </Button>
          </div>
        </Form>
      </div>
      {/* This will be hidden, but you can use it for other authenticate */}
      {/* <div className="relative flex w-full items-center justify-center">
        <span className="absolute w-full border-b border-border" />
        <span className="z-10 bg-card px-3 text-xs font-medium uppercase text-primary/60">
          Or
        </span>
      </div> */}
      <p className="px-12 text-center text-sm font-normal leading-normal text-primary/60">
        By clicking continue, you agree to our{" "}
        <a href="/" className="underline hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/" className="underline hover:text-primary">
          Privacy Policy.
        </a>
      </p>
    </div>
  );
};

export default LoginRoute;
