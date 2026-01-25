export default function HomeTitle({ username }: { username: string }) {
  return (
    <div className="mt-[140px] flex flex-col items-center justify-center gap-3 mb-10 text-text-primary">
      <p className="font-noto-sans-kr font-semibold text-[28px]">
        Hello {username}
      </p>
      <p className="font-noto-sans-kr text-[28px]">Welcome to GraphNode</p>
    </div>
  );
}
