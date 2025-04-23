import { useInputControl } from "@conform-to/react";
import { useId } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { REGEXP_ONLY_DIGITS_AND_CHARS, type OTPInputProps } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./ui/input-otp";
import { Textarea } from "./ui/textarea";
import { Checkbox, CheckboxProps } from "./ui/checkbox";

export type ListOfErrors = Array<string | null | undefined> | null | undefined;

export const ErrorList = ({
  id,
  errors,
}: {
  id?: string;
  errors?: ListOfErrors;
}) => {
  const errorsToRender = errors?.filter(Boolean);

  if (!errorsToRender?.length) {
    return null;
  }

  return (
    <ul id={id} className="flex flex-col gap-1">
      {errorsToRender.map((e) => {
        return (
          <li key={e} className="text-sm text-red-500">
            {e}
          </li>
        );
      })}
    </ul>
  );
};

export const Field = ({
  inputProps,
  labelProps,
  errors,
  className,
}: {
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  errors?: ListOfErrors;
  className?: string;
}) => {
  const fallbackId = useId();

  const id = inputProps.id ?? fallbackId;
  const errorId = errors?.length ? `${id}-errors` : undefined;

  return (
    <div className={`${className} flex flex-col gap-2`}>
      <Label htmlFor={id} {...labelProps} />
      <Input
        id={id}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        {...inputProps}
      />
      <div className="min-h-[32px] px-4 pb-3 pt-1">
        {errorId ? <ErrorList id={errorId} errors={errors} /> : null}
      </div>
    </div>
  );
};

export const OTPField = ({
  inputProps,
  labelProps,
  errors,
  className,
}: {
  inputProps: Partial<OTPInputProps & { render: never }>;
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  errors?: ListOfErrors;
  className?: string;
}) => {
  const fallbackId = useId();

  const id = inputProps.id ?? fallbackId;
  const errorId = errors?.length ? `${id}-errors` : undefined;

  return (
    <div className={className}>
      <Label htmlFor={id} {...labelProps} />
      <InputOTP
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        maxLength={6}
        id={id}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        {...inputProps}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <div className="min-h-[32px] px-4 pb-3 pt-1">
        {errorId ? <ErrorList id={errorId} errors={errors} /> : null}
      </div>
    </div>
  );
};

export const TextareaField = ({
  textareaProps,
  labelProps,
  errors,
  className,
}: {
  textareaProps: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  errors?: ListOfErrors;
  className?: string;
}) => {
  const fallbackId = useId();

  const id = textareaProps.id ?? textareaProps.name ?? fallbackId;
  const errorId = errors?.length ? `${id}-errors` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id} {...labelProps} />
      <Textarea
        id={id}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        {...textareaProps}
      />
      <div className="min-h-[32px] px-4 pb-3 pt-1">
        {errorId ? <ErrorList id={errorId} errors={errors} /> : null}
      </div>
    </div>
  );
};

export const CheckboxField = ({
  buttonProps,
  labelProps,
  errors,
  className,
}: {
  buttonProps: CheckboxProps & {
    name: string;
    form: string;
    value?: string;
  };
  labelProps: React.LabelHTMLAttributes<HTMLLabelElement>;
  errors?: ListOfErrors;
  className?: string;
}) => {
  const { key, defaultChecked, ...checkboxProps } = buttonProps;
  const fallbackId = useId();
  const checkedValue = buttonProps.value ?? "on";
  const input = useInputControl({
    key,
    name: buttonProps.name,
    formId: buttonProps.form,
    initialValue: defaultChecked ? checkedValue : undefined,
  });
  const id = buttonProps.id ?? fallbackId;
  const errorId = errors?.length ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Checkbox
          {...checkboxProps}
          id={id}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={errorId}
          checked={input.value === checkedValue}
          onCheckedChange={(state) => {
            input.change(state.valueOf() ? checkedValue : "");
            buttonProps.onCheckedChange?.(state);
          }}
          onFocus={(event) => {
            input.focus();
            buttonProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            input.blur();
            buttonProps.onBlur?.(event);
          }}
          type="button"
        />
        <label
          htmlFor={id}
          {...labelProps}
          className="self-center text-body-xs text-muted-foreground"
        />
      </div>
      <div className="px-4 pb-3 pt-1">
        {errorId ? <ErrorList id={errorId} errors={errors} /> : null}
      </div>
    </div>
  );
};
