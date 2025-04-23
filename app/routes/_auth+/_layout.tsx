import { Link, Outlet } from "@remix-run/react";
import { Logo } from "~/components/logo";

export default function Layout() {
  return (
    <div className="flex h-screen w-full">
      <div className="absolute left-1/2 top-10 mx-auto flex -translate-x-1/2 transform lg:hidden">
        <Link
          to={"/"}
          prefetch="intent"
          className="z-10 flex h-10 flex-col items-center justify-center gap-2"
        >
          <Logo />
        </Link>
      </div>
      <div className="relative hidden h-full w-[50%] flex-col justify-between overflow-hidden bg-card p-10 lg:flex">
        <Link
          to={"/"}
          prefetch="intent"
          className="z-10 flex h-10 w-10 items-center gap-1"
        >
          <Logo />
        </Link>

        <div className="z-10 flex flex-col items-start gap-2">
          Hello world !
        </div>
        <div className="base-grid absolute left-0 top-0 z-0 h-full w-full opacity-40" />
      </div>
      <div className="flex h-full w-full flex-col border-l border-primary/5 bg-card lg:w-[50%]">
        <Outlet />
      </div>
    </div>
  );
}
