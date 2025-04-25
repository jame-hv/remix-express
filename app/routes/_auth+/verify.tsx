import { z } from "zod";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useSearchParams } from "@remix-run/react";
import { useIsPending } from "~/utils/misc";
import { getZodConstraint } from "@conform-to/zod";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { ErrorList, OTPField } from "~/components/forms";
import { Button } from "~/components/ui/button";
import { GeneralErrorBoundary } from "~/components/error-boundary";

export const codeQueryParam = "code";
export const targetQueryParam = "target";
export const typeQueryParam = "type";
export const redirectToQueryParam = "redirectTo";

const types = ["onboarding", "reset-password", "change-email", "2fa"] as const;

const VerificationSchema = z.enum(types);

export type VerificationTypes = z.infer<typeof VerificationSchema>;

export const VerifySchema = z.object({
  [codeQueryParam]: z.string().min(6).max(6),
  [typeQueryParam]: VerificationSchema,
  [targetQueryParam]: z.string(),
  [redirectToQueryParam]: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  return {};
}

const VerifyRoute = () => {
  const [searchParams] = useSearchParams();
  const actionData = useActionData<typeof action>();
  const isPending = useIsPending();

  const parseWithZodType = VerificationSchema.safeParse(
    searchParams.get(typeQueryParam)
  );

  const types = parseWithZodType.success ? parseWithZodType.data : null;

  const checkEmail = (
    <>
      <h1 className="text-h1">Check your email</h1>
      <p className="mt-3 text-body-md text-muted-foreground">
        We have sent you a code to verify your email address.
      </p>
    </>
  );

  const headings: Record<VerificationTypes, React.ReactNode> = {
    onboarding: checkEmail,
    "reset-password": checkEmail,
    "change-email": checkEmail,
    "2fa": (
      <>
        <h1 className="text-h1">Check your 2FA app</h1>
        <p className="mt-3 text-body-md text-muted-foreground">
          Please enter your 2FA code to verify your identity.
        </p>
      </>
    ),
  };

  const [form, fields] = useForm({
    id: "verify-form",
    constraint: getZodConstraint(VerifySchema),
    lastResult:
      actionData && "result" in actionData ? actionData.result : undefined,
    defaultValues: {
      code: searchParams.get(codeQueryParam) ?? "",
      type: types,
      target: searchParams.get(targetQueryParam) ?? "",
      redirectTo: searchParams.get(redirectToQueryParam) ?? "",
    },
  });

  return (
    <main className="container flex flex-col w-72 max-w-full justify-center pt-20 pb-32 gap-2">
      <div className="text-center">
        {types ? headings[types] : "Invalid verification type"}
      </div>

      <div className="mx-auto flex flex-col w-72 max-w-full  justify-center gap-1">
        <div className="">
          <ErrorList errors={form.errors} id={form.errorId} />
        </div>
        <div className="flex w-full gap-2">
          <Form method="POST" {...getFormProps(form)} className="flex-1">
            <div className="flex items-center justify-center">
              <OTPField
                labelProps={{
                  htmlFor: fields[codeQueryParam].id,
                  children: "Code",
                }}
                inputProps={{
                  ...getInputProps(fields[codeQueryParam], { type: "text" }),
                  autoFocus: true,
                  autoComplete: "one-time-code",
                }}
                errors={fields[codeQueryParam].errors}
              />
            </div>

            <input
              {...getInputProps(fields[typeQueryParam], { type: "hidden" })}
            />
            <input
              {...getInputProps(fields[targetQueryParam], { type: "hidden" })}
            />
            <input
              {...getInputProps(fields[redirectToQueryParam], {
                type: "hidden",
              })}
            />
            <Button className="w-full mt-4" type="submit" disabled={isPending}>
              Submit
            </Button>
          </Form>
        </div>
      </div>
    </main>
  );
};

export default VerifyRoute;

export function ErrorBoundary() {
  return <GeneralErrorBoundary />;
}
