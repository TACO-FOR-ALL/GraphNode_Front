import AutoResizeTextarea from "@/components/AutoResizeTextArea";
import { useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { FaArrowRight, FaPlus } from "react-icons/fa6";
import { IoIosMore } from "react-icons/io";

const DUMMY_NOTES = [
  {
    id: 1,
    createdAt: new Date("2025-01-01"),
    title: "Note 1",
    content: `Cupidatat incididunt veniam proident voluptate enim dolore sit. Reprehenderit reprehenderit cupidatat eu mollit voluptate fugiat labore est labore aute. Laborum consectetur dolore nostrud laboris deserunt mollit irure adipisicing consequat ex excepteur. Fugiat voluptate ut veniam pariatur deserunt magna. Aute aliqua magna qui exercitation sint elit ut culpa. Commodo laborum labore laboris sunt commodo fugiat occaecat fugiat proident ad reprehenderit duis. Fugiat id et sit est ut eu tempor elit ea do cillum.

Consectetur et dolore aute id anim non culpa. Laboris adipisicing consequat cupidatat laborum irure duis eu consectetur. Ad minim nulla duis ut ut labore commodo tempor. Anim quis elit cupidatat ut amet dolore. Nulla nisi mollit ullamco esse quis id esse.

Labore exercitation veniam aliquip exercitation occaecat. Ut dolor ea et incididunt sint culpa qui nisi aliqua. Velit minim fugiat aliquip ea qui ex incididunt fugiat do est velit ad sunt. Minim culpa do irure cupidatat. Exercitation dolore elit ullamco ullamco minim aliqua elit tempor nisi dolor sunt consequat incididunt nisi. Cillum veniam eiusmod dolor cillum id laborum laboris aliqua voluptate qui laborum occaecat occaecat. Aliqua occaecat est ullamco.

Do duis laboris ex qui officia. Do ipsum minim sit labore pariatur velit adipisicing cillum excepteur duis mollit reprehenderit. Reprehenderit incididunt labore labore commodo amet et ex in. Dolor cupidatat eu ad. Lorem velit Lorem adipisicing anim Lorem amet nulla et deserunt culpa ut. Occaecat ut eiusmod exercitation nulla culpa et exercitation excepteur pariatur ullamco ad ad nulla ut fugiat. Elit sit ullamco non excepteur aliqua qui enim eiusmod excepteur. Labore velit tempor nostrud veniam cillum deserunt voluptate aliqua elit veniam quis.

Culpa culpa nulla eiusmod amet ut mollit est labore sint qui eiusmod excepteur non reprehenderit duis. Enim ea Lorem eu culpa consequat aliqua aute sunt dolor duis. Sit ullamco sit qui laborum sunt officia excepteur et deserunt incididunt Lorem amet reprehenderit. Consequat aliquip elit adipisicing et dolore do magna ad laborum occaecat in exercitation.`,
  },
  {
    id: 2,
    createdAt: new Date("2025-01-02"),
    title: "Note 2",
    content: `Cupidatat incididunt veniam proident voluptate enim dolore sit. Reprehenderit reprehenderit cupidatat eu mollit voluptate fugiat labore est labore aute. Laborum consectetur dolore nostrud laboris deserunt mollit irure adipisicing consequat ex excepteur. Fugiat voluptate ut veniam pariatur deserunt magna. Aute aliqua magna qui exercitation sint elit ut culpa. Commodo laborum labore laboris sunt commodo fugiat occaecat fugiat proident ad reprehenderit duis. Fugiat id et sit est ut eu tempor elit ea do cillum.

Consectetur et dolore aute id anim non culpa. Laboris adipisicing consequat cupidatat laborum irure duis eu consectetur. Ad minim nulla duis ut ut labore commodo tempor. Anim quis elit cupidatat ut amet dolore. Nulla nisi mollit ullamco esse quis id esse.

Labore exercitation veniam aliquip exercitation occaecat. Ut dolor ea et incididunt sint culpa qui nisi aliqua. Velit minim fugiat aliquip ea qui ex incididunt fugiat do est velit ad sunt. Minim culpa do irure cupidatat. Exercitation dolore elit ullamco ullamco minim aliqua elit tempor nisi dolor sunt consequat incididunt nisi. Cillum veniam eiusmod dolor cillum id laborum laboris aliqua voluptate qui laborum occaecat occaecat. Aliqua occaecat est ullamco.

Do duis laboris ex qui officia. Do ipsum minim sit labore pariatur velit adipisicing cillum excepteur duis mollit reprehenderit. Reprehenderit incididunt labore labore commodo amet et ex in. Dolor cupidatat eu ad. Lorem velit Lorem adipisicing anim Lorem amet nulla et deserunt culpa ut. Occaecat ut eiusmod exercitation nulla culpa et exercitation excepteur pariatur ullamco ad ad nulla ut fugiat. Elit sit ullamco non excepteur aliqua qui enim eiusmod excepteur. Labore velit tempor nostrud veniam cillum deserunt voluptate aliqua elit veniam quis.

Culpa culpa nulla eiusmod amet ut mollit est labore sint qui eiusmod excepteur non reprehenderit duis. Enim ea Lorem eu culpa consequat aliqua aute sunt dolor duis. Sit ullamco sit qui laborum sunt officia excepteur et deserunt incididunt Lorem amet reprehenderit. Consequat aliquip elit adipisicing et dolore do magna ad laborum occaecat in exercitation.`,
  },
  {
    id: 3,
    createdAt: new Date("2025-01-03"),
    title: "Note 3",
    content: `Cupidatat incididunt veniam proident voluptate enim dolore sit. Reprehenderit reprehenderit cupidatat eu mollit voluptate fugiat labore est labore aute. Laborum consectetur dolore nostrud laboris deserunt mollit irure adipisicing consequat ex excepteur. Fugiat voluptate ut veniam pariatur deserunt magna. Aute aliqua magna qui exercitation sint elit ut culpa. Commodo laborum labore laboris sunt commodo fugiat occaecat fugiat proident ad reprehenderit duis. Fugiat id et sit est ut eu tempor elit ea do cillum.

Consectetur et dolore aute id anim non culpa. Laboris adipisicing consequat cupidatat laborum irure duis eu consectetur. Ad minim nulla duis ut ut labore commodo tempor. Anim quis elit cupidatat ut amet dolore. Nulla nisi mollit ullamco esse quis id esse.

Labore exercitation veniam aliquip exercitation occaecat. Ut dolor ea et incididunt sint culpa qui nisi aliqua. Velit minim fugiat aliquip ea qui ex incididunt fugiat do est velit ad sunt. Minim culpa do irure cupidatat. Exercitation dolore elit ullamco ullamco minim aliqua elit tempor nisi dolor sunt consequat incididunt nisi. Cillum veniam eiusmod dolor cillum id laborum laboris aliqua voluptate qui laborum occaecat occaecat. Aliqua occaecat est ullamco.

Do duis laboris ex qui officia. Do ipsum minim sit labore pariatur velit adipisicing cillum excepteur duis mollit reprehenderit. Reprehenderit incididunt labore labore commodo amet et ex in. Dolor cupidatat eu ad. Lorem velit Lorem adipisicing anim Lorem amet nulla et deserunt culpa ut. Occaecat ut eiusmod exercitation nulla culpa et exercitation excepteur pariatur ullamco ad ad nulla ut fugiat. Elit sit ullamco non excepteur aliqua qui enim eiusmod excepteur. Labore velit tempor nostrud veniam cillum deserunt voluptate aliqua elit veniam quis.

Culpa culpa nulla eiusmod amet ut mollit est labore sint qui eiusmod excepteur non reprehenderit duis. Enim ea Lorem eu culpa consequat aliqua aute sunt dolor duis. Sit ullamco sit qui laborum sunt officia excepteur et deserunt incididunt Lorem amet reprehenderit. Consequat aliquip elit adipisicing et dolore do magna ad laborum occaecat in exercitation.`,
  },
  {
    id: 4,
    createdAt: new Date("2025-01-04"),
    title: "Note 4",
    content: `Cupidatat incididunt veniam proident voluptate enim dolore sit. Reprehenderit reprehenderit cupidatat eu mollit voluptate fugiat labore est labore aute. Laborum consectetur dolore nostrud laboris deserunt mollit irure adipisicing consequat ex excepteur. Fugiat voluptate ut veniam pariatur deserunt magna. Aute aliqua magna qui exercitation sint elit ut culpa. Commodo laborum labore laboris sunt commodo fugiat occaecat fugiat proident ad reprehenderit duis. Fugiat id et sit est ut eu tempor elit ea do cillum.

Consectetur et dolore aute id anim non culpa. Laboris adipisicing consequat cupidatat laborum irure duis eu consectetur. Ad minim nulla duis ut ut labore commodo tempor. Anim quis elit cupidatat ut amet dolore. Nulla nisi mollit ullamco esse quis id esse.

Labore exercitation veniam aliquip exercitation occaecat. Ut dolor ea et incididunt sint culpa qui nisi aliqua. Velit minim fugiat aliquip ea qui ex incididunt fugiat do est velit ad sunt. Minim culpa do irure cupidatat. Exercitation dolore elit ullamco ullamco minim aliqua elit tempor nisi dolor sunt consequat incididunt nisi. Cillum veniam eiusmod dolor cillum id laborum laboris aliqua voluptate qui laborum occaecat occaecat. Aliqua occaecat est ullamco.

Do duis laboris ex qui officia. Do ipsum minim sit labore pariatur velit adipisicing cillum excepteur duis mollit reprehenderit. Reprehenderit incididunt labore labore commodo amet et ex in. Dolor cupidatat eu ad. Lorem velit Lorem adipisicing anim Lorem amet nulla et deserunt culpa ut. Occaecat ut eiusmod exercitation nulla culpa et exercitation excepteur pariatur ullamco ad ad nulla ut fugiat. Elit sit ullamco non excepteur aliqua qui enim eiusmod excepteur. Labore velit tempor nostrud veniam cillum deserunt voluptate aliqua elit veniam quis.

Culpa culpa nulla eiusmod amet ut mollit est labore sint qui eiusmod excepteur non reprehenderit duis. Enim ea Lorem eu culpa consequat aliqua aute sunt dolor duis. Sit ullamco sit qui laborum sunt officia excepteur et deserunt incididunt Lorem amet reprehenderit. Consequat aliquip elit adipisicing et dolore do magna ad laborum occaecat in exercitation.`,
  },
  {
    id: 5,
    createdAt: new Date("2025-01-05"),
    title: "Note 5",
    content: `Cupidatat incididunt veniam proident voluptate enim dolore sit. Reprehenderit reprehenderit cupidatat eu mollit voluptate fugiat labore est labore aute. Laborum consectetur dolore nostrud laboris deserunt mollit irure adipisicing consequat ex excepteur. Fugiat voluptate ut veniam pariatur deserunt magna. Aute aliqua magna qui exercitation sint elit ut culpa. Commodo laborum labore laboris sunt commodo fugiat occaecat fugiat proident ad reprehenderit duis. Fugiat id et sit est ut eu tempor elit ea do cillum.

Consectetur et dolore aute id anim non culpa. Laboris adipisicing consequat cupidatat laborum irure duis eu consectetur. Ad minim nulla duis ut ut labore commodo tempor. Anim quis elit cupidatat ut amet dolore. Nulla nisi mollit ullamco esse quis id esse.

Labore exercitation veniam aliquip exercitation occaecat. Ut dolor ea et incididunt sint culpa qui nisi aliqua. Velit minim fugiat aliquip ea qui ex incididunt fugiat do est velit ad sunt. Minim culpa do irure cupidatat. Exercitation dolore elit ullamco ullamco minim aliqua elit tempor nisi dolor sunt consequat incididunt nisi. Cillum veniam eiusmod dolor cillum id laborum laboris aliqua voluptate qui laborum occaecat occaecat. Aliqua occaecat est ullamco.

Do duis laboris ex qui officia. Do ipsum minim sit labore pariatur velit adipisicing cillum excepteur duis mollit reprehenderit. Reprehenderit incididunt labore labore commodo amet et ex in. Dolor cupidatat eu ad. Lorem velit Lorem adipisicing anim Lorem amet nulla et deserunt culpa ut. Occaecat ut eiusmod exercitation nulla culpa et exercitation excepteur pariatur ullamco ad ad nulla ut fugiat. Elit sit ullamco non excepteur aliqua qui enim eiusmod excepteur. Labore velit tempor nostrud veniam cillum deserunt voluptate aliqua elit veniam quis.

Culpa culpa nulla eiusmod amet ut mollit est labore sint qui eiusmod excepteur non reprehenderit duis. Enim ea Lorem eu culpa consequat aliqua aute sunt dolor duis. Sit ullamco sit qui laborum sunt officia excepteur et deserunt incididunt Lorem amet reprehenderit. Consequat aliquip elit adipisicing et dolore do magna ad laborum occaecat in exercitation.`,
  },
  {
    id: 6,
    createdAt: new Date("2025-01-06"),
    title: "Note 6",
    content: `Cupidatat incididunt veniam proident voluptate enim dolore sit. Reprehenderit reprehenderit cupidatat eu mollit voluptate fugiat labore est labore aute. Laborum consectetur dolore nostrud laboris deserunt mollit irure adipisicing consequat ex excepteur. Fugiat voluptate ut veniam pariatur deserunt magna. Aute aliqua magna qui exercitation sint elit ut culpa. Commodo laborum labore laboris sunt commodo fugiat occaecat fugiat proident ad reprehenderit duis. Fugiat id et sit est ut eu tempor elit ea do cillum.

Consectetur et dolore aute id anim non culpa. Laboris adipisicing consequat cupidatat laborum irure duis eu consectetur. Ad minim nulla duis ut ut labore commodo tempor. Anim quis elit cupidatat ut amet dolore. Nulla nisi mollit ullamco esse quis id esse.

Labore exercitation veniam aliquip exercitation occaecat. Ut dolor ea et incididunt sint culpa qui nisi aliqua. Velit minim fugiat aliquip ea qui ex incididunt fugiat do est velit ad sunt. Minim culpa do irure cupidatat. Exercitation dolore elit ullamco ullamco minim aliqua elit tempor nisi dolor sunt consequat incididunt nisi. Cillum veniam eiusmod dolor cillum id laborum laboris aliqua voluptate qui laborum occaecat occaecat. Aliqua occaecat est ullamco.

Do duis laboris ex qui officia. Do ipsum minim sit labore pariatur velit adipisicing cillum excepteur duis mollit reprehenderit. Reprehenderit incididunt labore labore commodo amet et ex in. Dolor cupidatat eu ad. Lorem velit Lorem adipisicing anim Lorem amet nulla et deserunt culpa ut. Occaecat ut eiusmod exercitation nulla culpa et exercitation excepteur pariatur ullamco ad ad nulla ut fugiat. Elit sit ullamco non excepteur aliqua qui enim eiusmod excepteur. Labore velit tempor nostrud veniam cillum deserunt voluptate aliqua elit veniam quis.

Culpa culpa nulla eiusmod amet ut mollit est labore sint qui eiusmod excepteur non reprehenderit duis. Enim ea Lorem eu culpa consequat aliqua aute sunt dolor duis. Sit ullamco sit qui laborum sunt officia excepteur et deserunt incididunt Lorem amet reprehenderit. Consequat aliquip elit adipisicing et dolore do magna ad laborum occaecat in exercitation.`,
  },
  {
    id: 7,
    createdAt: new Date("2025-01-07"),
    title: "Note 7",
    content: `Cupidatat incididunt veniam proident voluptate enim dolore sit. Reprehenderit reprehenderit cupidatat eu mollit voluptate fugiat labore est labore aute. Laborum consectetur dolore nostrud laboris deserunt mollit irure adipisicing consequat ex excepteur. Fugiat voluptate ut veniam pariatur deserunt magna. Aute aliqua magna qui exercitation sint elit ut culpa. Commodo laborum labore laboris sunt commodo fugiat occaecat fugiat proident ad reprehenderit duis. Fugiat id et sit est ut eu tempor elit ea do cillum.

Consectetur et dolore aute id anim non culpa. Laboris adipisicing consequat cupidatat laborum irure duis eu consectetur. Ad minim nulla duis ut ut labore commodo tempor. Anim quis elit cupidatat ut amet dolore. Nulla nisi mollit ullamco esse quis id esse.

Labore exercitation veniam aliquip exercitation occaecat. Ut dolor ea et incididunt sint culpa qui nisi aliqua. Velit minim fugiat aliquip ea qui ex incididunt fugiat do est velit ad sunt. Minim culpa do irure cupidatat. Exercitation dolore elit ullamco ullamco minim aliqua elit tempor nisi dolor sunt consequat incididunt nisi. Cillum veniam eiusmod dolor cillum id laborum laboris aliqua voluptate qui laborum occaecat occaecat. Aliqua occaecat est ullamco.

Do duis laboris ex qui officia. Do ipsum minim sit labore pariatur velit adipisicing cillum excepteur duis mollit reprehenderit. Reprehenderit incididunt labore labore commodo amet et ex in. Dolor cupidatat eu ad. Lorem velit Lorem adipisicing anim Lorem amet nulla et deserunt culpa ut. Occaecat ut eiusmod exercitation nulla culpa et exercitation excepteur pariatur ullamco ad ad nulla ut fugiat. Elit sit ullamco non excepteur aliqua qui enim eiusmod excepteur. Labore velit tempor nostrud veniam cillum deserunt voluptate aliqua elit veniam quis.

Culpa culpa nulla eiusmod amet ut mollit est labore sint qui eiusmod excepteur non reprehenderit duis. Enim ea Lorem eu culpa consequat aliqua aute sunt dolor duis. Sit ullamco sit qui laborum sunt officia excepteur et deserunt incididunt Lorem amet reprehenderit. Consequat aliquip elit adipisicing et dolore do magna ad laborum occaecat in exercitation.`,
  },
];

export default function Home() {
  const [input, setInput] = useState("");

  const handleSend = () => {
    console.log("send");
  };

  return (
    <div className="flex flex-col items-center">
      {/* title */}
      <div className="mt-[140px] flex flex-col items-center justify-center gap-3 mb-10">
        <p className="font-noto-sans-kr font-semibold text-[28px]">
          Hello John Han
        </p>
        <p className="font-noto-sans-kr text-[28px]">Welcome to GraphNode</p>
      </div>
      {/* chatbox */}
      <div className="flex w-[744px] flex-col py-3 pl-3 items-center justify-center rounded-xl border-[1px] border-[rgba(var(--color-chatbox-border-rgb),0.2)] border-solid shadow-[0_2px_20px_0_#badaff]">
        <AutoResizeTextarea
          value={input}
          onChange={setInput}
          placeholder="How can I help you?"
        />
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-1 items-center cursor-pointer bg-[rgba(var(--color-chatbox-active-rgb),0.05)] p-[6px] rounded-[8px] shadow-[0_0_3px_0_#badaff]">
            <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
              <span className="text-chatbox-active">ChatGPT</span> 5.1 Instant
            </p>
            <IoIosArrowDown className="text-[16px] text-chatbox-active" />
          </div>
          <div
            onClick={() => input.length > 0 && handleSend()}
            className={`w-[28px] h-[28px] text-white p-[6px] text-[16px] rounded-[8px] mr-3 ${input.length > 0 ? "bg-chatbox-active cursor-pointer" : "bg-text-placeholder cursor-not-allowed"}`}
          >
            <FaArrowRight />
          </div>
        </div>
      </div>
      {/* notebox */}
      <div className="mt-[150px] w-[744px] flex flex-col items-center max-h-[calc(100vh-600px)] overflow-y-auto scroll-hidden">
        <p className="mb-6 font-noto-sans-kr font-medium text-[28px]">
          Recent Notes
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="w-[240px] flex items-center justify-center cursor-pointer h-[180px] rounded-[12px] border-[1px] border-dashed border-[rgba(var(--color-chatbox-border-rgb),0.2)] bg-notebox-background">
            <FaPlus className="text-[28px] text-[rgba(var(--color-notebox-add-rgb),0.2)]" />
          </div>
          {DUMMY_NOTES.map((note) => (
            <div
              key={note.id}
              className="w-[240px] px-[16px] py-[14px] flex flex-col cursor-pointer h-[180px] rounded-[12px] border-[1px] border-solid border-[rgba(var(--color-chatbox-border-rgb),0.2)] bg-notebox-background"
            >
              <p className="font-noto-sans-kr font-medium text-[16px] mb-3">
                {note.title}
              </p>
              <p className="line-clamp-3 font-noto-sans-kr text-[12px]">
                {note.content}
              </p>
              <div className="flex mt-11 items-center justify-between text-text-tertiary">
                <p className="font-noto-sans-kr text-[12px]">
                  {note.createdAt.toLocaleDateString()}
                </p>
                <IoIosMore className="text-[16px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
