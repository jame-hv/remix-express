import { cn } from "~/utils/misc";

type LogoProps = {
  width?: number;
  height?: number;
  className?: string;
  [key: string]: unknown | undefined;
};

export function Logo({ width, height, className, ...args }: LogoProps) {
  return (
    <svg
      {...args}
      width={width ?? 40}
      height={height ?? 40}
      xmlns="http://www.w3.org/2000/svg"
      className={cn(`text-primary ${className}`)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="8" cy="9" r="2" fill="white" className="animate-pulse">
        <animate
          attributeName="r"
          values="2;1.5;2"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="16" cy="9" r="2" fill="white" className="animate-pulse">
        <animate
          attributeName="r"
          values="2;1.5;2"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      <path
        d="M7.5 15.5C9 17.5 15 17.5 16.5 15.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      >
        <animate
          attributeName="d"
          values="M7.5 15.5C9 17.5 15 17.5 16.5 15.5; M7.5 13.5C9 16 15 16 16.5 13.5; M7.5 15.5C9 17.5 15 17.5 16.5 15.5"
          dur="5s"
          repeatCount="indefinite"
        />
      </path>
      <path
        d="M7 5 L8 7 M17 5 L16 7"
        stroke="white"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
