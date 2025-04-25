import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { requireAnonymous } from "~/modules/auth/auth.server";
import { EmailSchema } from "~/modules/auth/validator";
import { z } from "zod";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
  data,
  Form,
  Link,
  useActionData,
  useSearchParams,
} from "@remix-run/react";
import { ErrorList, Field } from "~/components/forms";
import { Button } from "~/components/ui/button";
import { prisma } from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAnonymous(request);
  return {};
}

const RegisterSchema = z.object({
  email: EmailSchema,
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  console.log(formData);

  const submission = await parseWithZod(formData, {
    schema: RegisterSchema.superRefine(async (data, context) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });

      if (existingUser) {
        context.addIssue({
          path: ["email"],
          code: z.ZodIssueCode.custom,
          message: "Email already exists",
        });
        return;
      }
    }),
    async: true,
  });

  if (submission.status !== "success") {
    return data(
      { result: submission.reply() },
      { status: submission.status === "error" ? 400 : 200 }
    );
  }

  const { email } = submission.value;

  // const {verifyUrl, redirectTo,otp} = prepareVerification

  return {
    result: "",
  };
}

const RegisterRoute = () => {
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const [form, fields] = useForm({
    id: "register-form",
    constraints: getZodConstraint(RegisterSchema),
    defaultValues: { redirectTo },
    lastResult:
      actionData && "result" in actionData ? actionData.result : undefined,
    onValidate({ formData }) {
      const result = parseWithZod(formData, { schema: RegisterSchema });
      return result;
    },
    shouldRevalidate: "onBlur",
  });

  return (
    <div className="container mx-auto flex h-full w-full  flex-col justify-center pt-20 pb-32">
      <div className="text-center">
        <h1 className="text-h1 text-center text-2xl font-medium text-primary">
          Start your journey!
        </h1>
        <p className="text-body-md text-muted-foreground mt-3">
          Please enter your email.
        </p>
      </div>
      <div className="mx-auto mt-16 max-w-sm min-w-full sm:min-w-[368px]">
        <Form method="POST" {...getFormProps(form)}>
          <Field
            labelProps={{
              htmlFor: fields.email.id,
              children: "Email",
            }}
            inputProps={{
              ...getInputProps(fields.email, { type: "email" }),
              autoFocus: true,
              autoComplete: "email",
            }}
            errors={fields.email.errors}
          />
          <ErrorList errors={form.errors} id={form.errorId} />
          <div className="">
            <Link to="/login" className="text-sm underline hover:text-blue-500">
              Already have an account? Log in
            </Link>
          </div>
          <Button className="w-full mt-4" type="submit">
            Submit
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default RegisterRoute;
