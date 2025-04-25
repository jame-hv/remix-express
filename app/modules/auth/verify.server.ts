import { type Submission } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { data } from "@remix-run/node";
import { z } from "zod";
import { prisma } from "~/db.server";
import {
  codeQueryParam,
  redirectToQueryParam,
  targetQueryParam,
  typeQueryParam,
  VerifySchema,
  type VerificationTypes,
} from "~/routes/_auth+/verify";
import { getDomainUrl } from "~/utils/misc";

export type VerifyFunctionArgs = {
  request: Request;
  submission: Submission<
    z.input<typeof VerifySchema>,
    string[],
    z.output<typeof VerifySchema>
  >;
  body: FormData | URLSearchParams;
};

export function getRedirectToUrl({
  request,
  type,
  target,
  redirectTo,
}: {
  request: Request;
  type: VerificationTypes;
  target: string;
  redirectTo?: string;
}) {
  const redirectToUrl = new URL(`${getDomainUrl(request)}/verify`);
  redirectToUrl.searchParams.set(typeQueryParam, type);
  redirectToUrl.searchParams.set(targetQueryParam, target);
  if (redirectTo) {
    redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo);
  }
  return redirectToUrl;
}

// export async function requireRecentVerification(request: Request) {
//   const userId = await requireUserId(request);
//   const shouldReverify = await shouldRequestTwoFA(request);
//   if (shouldReverify) {
//     const reqUrl = new URL(request.url);
//     const redirectUrl = getRedirectToUrl({
//       request,
//       target: userId,
//       type: twoFAVerificationType,
//       redirectTo: reqUrl.pathname + reqUrl.search,
//     });
//     throw await redirectWithToast(redirectUrl.toString(), {
//       title: "Please Reverify",
//       description: "Please reverify your account before proceeding",
//     });
//   }
// }

export async function prepareVerification({
  period,
  request,
  type,
  target,
}: {
  period: number;
  request: Request;
  type: VerificationTypes;
  target: string;
}) {
  const verifyUrl = getRedirectToUrl({ request, type, target });
  const redirectTo = new URL(verifyUrl.toString());

  //   const { otp, ...verificationConfig } = await generateTOTP({
  //     algorithm: "SHA-256",
  //     // Leaving off 0, O, and I on purpose to avoid confusing users.
  //     charSet: "ABCDEFGHJKLMNPQRSTUVWXYZ123456789",
  //     period,
  //   });
  //   const verificationData = {
  //     type,
  //     target,
  //     ...verificationConfig,
  //     expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
  //   };
  //   await prisma.verification.upsert({
  //     where: { target_type: { target, type } },
  //     create: verificationData,
  //     update: verificationData,
  //   });

  //   // add the otp to the url we'll email the user.
  //   verifyUrl.searchParams.set(codeQueryParam, otp);

  return { redirectTo, verifyUrl };
}

export async function isCodeValid({
  code,
  type,
  target,
}: {
  code: string;
  type: VerificationTypes;
  target: string;
}) {
  const verification = await prisma.verification.findUnique({
    where: {
      target_type: { target, type },
      OR: [{ expiresAt: { gt: new Date() } }, { expiresAt: null }],
    },
    select: { algorithm: true, secret: true, period: true, charSet: true },
  });
  if (!verification) return false;
  const result = await verifyTOTP({
    otp: code,
    ...verification,
  });
  if (!result) return false;

  return true;
}

export async function validateRequest(
  request: Request,
  body: URLSearchParams | FormData
) {
  const submission = await parseWithZod(body, {
    schema: VerifySchema.superRefine(async (data, ctx) => {
      const codeIsValid = await isCodeValid({
        code: data[codeQueryParam],
        type: data[typeQueryParam],
        target: data[targetQueryParam],
      });
      if (!codeIsValid) {
        ctx.addIssue({
          path: ["code"],
          code: z.ZodIssueCode.custom,
          message: `Invalid code`,
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

  const { value: submissionValue } = submission;

  async function deleteVerification() {
    await prisma.verification.delete({
      where: {
        target_type: {
          type: submissionValue[typeQueryParam],
          target: submissionValue[targetQueryParam],
        },
      },
    });
  }

  switch (submissionValue[typeQueryParam]) {
    // case "reset-password": {
    //   await deleteVerification();
    //   return handleResetPasswordVerification({ request, body, submission });
    // }
    case "onboarding": {
      await deleteVerification();
      return handleOnboardingVerification({ request, body, submission });
    }
    // case "change-email": {
    //   await deleteVerification();
    //   return handleChangeEmailVerification({ request, body, submission });
    // }
    // case "2fa": {
    //   return handleLoginTwoFactorVerification({ request, body, submission });
    // }
  }
}
