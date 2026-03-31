import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSetupStore } from "@/store/useSetupStore";
import Lottie from "lottie-react";
import welcomeAnimation from "@/assets/lottie/welcome.json";
import logoSrc from "@/assets/icons/logo.svg";

type Step = "welcome" | "consent";
type ConsentChoice = "agree" | "disagree" | null;

type Section = {
  title: string;
  content: (string | { label: string; value: string }[])[];
};

function getConsentSections(lang: string): Section[] {
  if (lang === "ko") {
    return [
      {
        title: "수집하는 개인정보 항목",
        content: [
          "GraphNode는 서비스 제공을 위하여 다음과 같은 개인정보를 수집할 수 있습니다.",
          "(1) 회원가입 및 계정 생성 시\n• 이메일 주소\n• 이름 또는 닉네임",
          "(2) 서비스 이용 과정에서 자동으로 수집되는 정보\n• 서비스 이용 기록\n• 로그 데이터\n• 접속 IP 주소\n• 기기 및 브라우저 정보\n• 쿠키 및 세션 정보\n• 외부 API",
          "(3) 유저 AI 대화 내역\n• 텍스트 노트\n• 파일\n• 링크",
        ],
      },
      {
        title: "개인정보 수집 및 이용 목적",
        content: [
          "수집된 개인정보는 다음 목적을 위하여 이용됩니다.\n• 서비스 제공 및 운영\n• AI 기반 데이터 분석 및 노트 구조화 기능 제공\n• 서비스 개선 및 기능 개발\n• 사용자 문의 대응 및 고객지원",
        ],
      },
      {
        title: "개인정보 보유 및 이용 기간",
        content: [
          "운영자는 개인정보를 수집 및 이용 목적이 달성될 때까지 보유합니다. 다만 다음의 경우에는 해당 기간 동안 보관할 수 있습니다.",
          "• 계정 정보: 회원 탈퇴 시까지\n\n회원이 탈퇴할 경우 관련 개인정보는 지체 없이 삭제됩니다.",
        ],
      },
      {
        title: "개인정보 제3자 제공",
        content: [
          "운영자는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 다음의 경우에는 예외적으로 제공될 수 있습니다.\n• 이용자가 사전에 동의한 경우\n• 법령에 따라 요구되는 경우\n• 서비스 제공을 위해 필요한 범위에서 처리 위탁이 이루어지는 경우",
        ],
      },
      {
        title: "개인정보 처리 위탁",
        content: [
          "서비스 운영을 위해 다음과 같은 업무를 외부 업체에 위탁할 수 있습니다.\n• 클라우드 서버 운영: 서비스 인프라 제공\n• 이메일 발송 시스템: 인증 및 알림 메일 발송\n\n운영자는 위탁계약 체결 시 개인정보 보호 관련 법령을 준수하도록 관리·감독합니다.",
        ],
      },
      {
        title: "이용자의 권리",
        content: [
          "이용자는 언제든지 다음 권리를 행사할 수 있습니다.\n• 개인정보 열람 요청\n• 개인정보 정정 혹은 삭제 요청\n• 개인정보 처리 정지 요청\n• 계정 삭제 요청",
        ],
      },
      {
        title: "동의 거부 권리",
        content: [
          "이용자는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 다만 필수 항목에 대한 동의를 거부할 경우 서비스 이용이 제한될 수 있습니다.",
        ],
      },
    ];
  }

  if (lang === "zh") {
    return [
      {
        title: "收集的个人信息项目",
        content: [
          "GraphNode 为提供服务，可能收集以下个人信息。",
          "(1) 注册账户时\n• 电子邮件地址\n• 姓名或昵称",
          "(2) 使用服务过程中自动收集的信息\n• 服务使用记录\n• 日志数据\n• 访问IP地址\n• 设备及浏览器信息\n• Cookie及会话信息\n• 外部API",
          "(3) 用户AI对话记录\n• 文本笔记\n• 文件\n• 链接",
        ],
      },
      {
        title: "个人信息收集及使用目的",
        content: [
          "收集的个人信息将用于以下目的：\n• 服务提供与运营\n• 基于AI的数据分析及笔记结构化功能\n• 服务改善及功能开发\n• 用户咨询处理及客户支持",
        ],
      },
      {
        title: "个人信息保存及使用期限",
        content: [
          "运营者将在个人信息收集及使用目的达成之前保存个人信息。\n• 账户信息：至会员注销为止\n\n会员注销时，相关个人信息将立即删除。",
        ],
      },
      {
        title: "个人信息第三方提供",
        content: [
          "原则上，运营者不向外部提供用户个人信息。但以下情况除外：\n• 用户事先同意\n• 法律法规要求\n• 服务提供所需的必要委托范围内",
        ],
      },
      {
        title: "个人信息处理委托",
        content: [
          "为服务运营，可将以下业务委托给外部机构：\n• 云服务器运营：提供服务基础设施\n• 邮件发送系统：认证及通知邮件发送",
        ],
      },
      {
        title: "用户权利",
        content: [
          "用户可随时行使以下权利：\n• 个人信息查阅申请\n• 个人信息更正或删除申请\n• 个人信息处理停止申请\n• 账户删除申请",
        ],
      },
      {
        title: "拒绝同意的权利",
        content: [
          "用户有权拒绝同意个人信息收集及使用。但拒绝必要项目同意时，可能限制服务使用。",
        ],
      },
    ];
  }

  if (lang === "ja") {
    return [
      {
        title: "収集する個人情報の項目",
        content: [
          "GraphNodeはサービス提供のために以下の個人情報を収集する場合があります。",
          "(1) 会員登録・アカウント作成時\n• メールアドレス\n• 氏名またはニックネーム",
          "(2) サービス利用中に自動収集される情報\n• サービス利用記録\n• ログデータ\n• 接続IPアドレス\n• デバイス・ブラウザ情報\n• CookieおよびセッションI情報\n• 外部API",
          "(3) ユーザーAI会話履歴\n• テキストノート\n• ファイル\n• リンク",
        ],
      },
      {
        title: "個人情報の収集・利用目的",
        content: [
          "収集した個人情報は以下の目的で利用されます：\n• サービスの提供・運営\n• AIベースのデータ分析とノート構造化機能の提供\n• サービス改善・機能開発\n• お問い合わせ対応・カスタマーサポート",
        ],
      },
      {
        title: "個人情報の保有・利用期間",
        content: [
          "運営者は収集・利用目的が達成されるまで個人情報を保有します。\n• アカウント情報：退会まで\n\n退会した場合、関連個人情報は速やかに削除されます。",
        ],
      },
      {
        title: "個人情報の第三者提供",
        content: [
          "原則として、運営者はユーザーの個人情報を外部に提供しません。ただし以下の場合は例外です：\n• ユーザーが事前に同意した場合\n• 法令による要求がある場合\n• サービス提供に必要な範囲での委託",
        ],
      },
      {
        title: "個人情報処理の委託",
        content: [
          "サービス運営のため、以下の業務を外部に委託する場合があります：\n• クラウドサーバー運営：インフラ提供\n• メール送信システム：認証・通知メール送信",
        ],
      },
      {
        title: "ユーザーの権利",
        content: [
          "ユーザーはいつでも以下の権利を行使できます：\n• 個人情報の閲覧請求\n• 個人情報の訂正・削除請求\n• 個人情報処理の停止請求\n• アカウント削除請求",
        ],
      },
      {
        title: "同意拒否の権利",
        content: [
          "ユーザーは個人情報の収集・利用への同意を拒否する権利があります。ただし必須項目への同意を拒否した場合、サービス利用が制限される場合があります。",
        ],
      },
    ];
  }

  // en (default)
  return [
    {
      title: "Personal Information Collected",
      content: [
        "GraphNode may collect the following personal information to provide our services.",
        "(1) During account registration\n• Email address\n• Name or nickname",
        "(2) Automatically collected during service use\n• Service usage records\n• Log data\n• IP address\n• Device and browser information\n• Cookie and session data\n• External API data",
        "(3) User AI conversation data\n• Text notes\n• Files\n• Links",
      ],
    },
    {
      title: "Purpose of Collection and Use",
      content: [
        "Collected personal information is used for:\n• Service provision and operation\n• AI-based data analysis and note structuring\n• Service improvement and feature development\n• Customer support",
      ],
    },
    {
      title: "Retention Period",
      content: [
        "Personal information is retained until the purpose of collection is fulfilled.\n• Account information: until account deletion\n\nUpon account deletion, personal information will be promptly removed.",
      ],
    },
    {
      title: "Third-Party Disclosure",
      content: [
        "We do not share personal information with third parties except:\n• With prior user consent\n• As required by law\n• For service provision within necessary scope",
      ],
    },
    {
      title: "Data Processing Delegation",
      content: [
        "We may delegate the following to third parties:\n• Cloud server operation: infrastructure services\n• Email delivery: authentication and notification emails",
      ],
    },
    {
      title: "User Rights",
      content: [
        "Users may exercise the following rights at any time:\n• Request access to personal information\n• Request correction or deletion\n• Request suspension of processing\n• Request account deletion",
      ],
    },
    {
      title: "Right to Refuse Consent",
      content: [
        "Users have the right to refuse consent. However, refusing consent to required items may restrict service access.",
      ],
    },
  ];
}

function getConsentHeader(lang: string): {
  serviceName: string;
  controller: string;
  intro: string;
} {
  if (lang === "ko")
    return {
      serviceName: "서비스명: GraphNode",
      controller: "개인정보처리자: GraphNode 운영자(이하 '운영자')",
      intro:
        "본 서비스는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고, 관련 법령을 준수하며 다음과 같이 개인정보를 수집·이용합니다.",
    };
  if (lang === "zh")
    return {
      serviceName: "服务名称: GraphNode",
      controller: "个人信息处理者: GraphNode 运营者（以下简称'运营者'）",
      intro:
        "本服务依据相关隐私法律法规保护用户个人信息，并按以下方式收集和使用个人信息。",
    };
  if (lang === "ja")
    return {
      serviceName: "サービス名: GraphNode",
      controller: "個人情報取扱者: GraphNode 運営者（以下「運営者」）",
      intro:
        "本サービスは、関連する個人情報保護法令に従い、利用者の個人情報を保護し、以下のとおり個人情報を収集・利用します。",
    };
  return {
    serviceName: "Service: GraphNode",
    controller: "Data Controller: GraphNode Operator (hereinafter 'Operator')",
    intro:
      "This service collects and uses personal information in accordance with applicable privacy laws to protect user data as follows.",
  };
}

export default function Setup() {
  const { hasCompletedSetup, completeSetup } = useSetupStore();
  const [step, setStep] = useState<Step>("welcome");
  const [consentChoice, setConsentChoice] = useState<ConsentChoice>(null);

  // 이미 완료된 경우 즉시 스킵
  useEffect(() => {
    if (hasCompletedSetup) {
      window.electron?.send("setup-complete");
    }
  }, []);

  const handleClose = () => window.windowAPI?.close();
  const handleMinimize = () => window.windowAPI?.minimize();

  const handleStart = () => {
    completeSetup();
    window.electron?.send("setup-complete");
  };

  if (step === "welcome") {
    return (
      <WelcomeStep
        onNext={() => setStep("consent")}
        onClose={handleClose}
        onMinimize={handleMinimize}
      />
    );
  }

  return (
    <ConsentStep
      consentChoice={consentChoice}
      setConsentChoice={setConsentChoice}
      onStart={handleStart}
      onClose={handleClose}
      onMinimize={handleMinimize}
    />
  );
}

function WelcomeStep({
  onNext,
  onClose,
  onMinimize,
}: {
  onNext: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const { t } = useTranslation();
  const [updateStatus, setUpdateStatus] = useState<"checking" | "done">(
    "checking",
  );

  useEffect(() => {
    const timer = setTimeout(() => setUpdateStatus("done"), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen flex flex-col relative bg-white text-center">
      <div className="absolute top-0 right-0 pointer-events-none overflow-hidden w-64 h-64 z-0">
        <img
          src={logoSrc}
          alt=""
          className="absolute -top-10 -right-10 w-56 h-56 opacity-[0.12]"
        />
      </div>
      {/* 트래픽 라이트 */}
      <header className="pt-3 px-4 flex items-center gap-2 drag-region flex-shrink-0">
        <div
          onClick={onClose}
          className="w-3 h-3 rounded-full cursor-pointer bg-[#ff5f57] no-drag"
        />
        <div
          onClick={onMinimize}
          className="w-3 h-3 rounded-full cursor-pointer bg-[#fdbc2c] no-drag"
        />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
      </header>

      {/* 본문 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 no-drag">
        <Lottie animationData={welcomeAnimation} loop className="mt-20" />

        <h1 className="text-[22px] font-semibold text-gray-900 mb-2 mt-14">
          {t("setup.welcome.title")}
        </h1>
        <p className="text-[13px] text-gray-500 leading-relaxed">
          {t("setup.welcome.subtitle")}
        </p>
      </div>

      {/* 업데이트 상태 + 다음 버튼 */}
      <div className="px-6 pb-8 flex flex-col items-center gap-3 no-drag">
        <p className="text-[11px] text-gray-400">
          {updateStatus === "checking"
            ? t("setup.welcome.checkingUpdate")
            : t("setup.welcome.upToDate")}
        </p>
        <button
          onClick={onNext}
          disabled={updateStatus === "checking"}
          className="w-full py-2.5 rounded-full bg-primary text-white text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity"
        >
          {t("setup.welcome.next")}
        </button>
      </div>
    </div>
  );
}

function ConsentStep({
  consentChoice,
  setConsentChoice,
  onStart,
  onClose,
  onMinimize,
}: {
  consentChoice: ConsentChoice;
  setConsentChoice: (v: ConsentChoice) => void;
  onStart: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.split("-")[0];
  const sections = getConsentSections(lang);
  const header = getConsentHeader(lang);
  const canStart = consentChoice === "agree";

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* 트래픽 라이트 */}
      <header className="pt-3 px-4 flex items-center gap-2 drag-region flex-shrink-0">
        <div
          onClick={onClose}
          className="w-3 h-3 rounded-full cursor-pointer bg-[#ff5f57] no-drag"
        />
        <div
          onClick={onMinimize}
          className="w-3 h-3 rounded-full cursor-pointer bg-[#fdbc2c] no-drag"
        />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[12px] font-semibold text-gray-500 no-drag tracking-wide uppercase">
          {t("setup.consent.title")}
        </span>
      </header>

      {/* 동의서 본문 스크롤 영역 */}
      <div
        className="flex-1 overflow-y-auto px-5 pt-4 pb-2 text-left no-drag"
        style={{ scrollbarWidth: "thin" }}
      >
        {/* 헤더 박스 */}
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-[12px] font-bold text-gray-800 mb-0.5">
            {header.serviceName}
          </p>
          <p className="text-[11.5px] text-gray-500 mb-1.5">
            {header.controller}
          </p>
          <p className="text-[11.5px] text-gray-600 leading-relaxed">
            {header.intro}
          </p>
        </div>

        {sections.map((section, i) => (
          <div key={i} className="mb-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1 h-3.5 rounded-full bg-primary/60 flex-shrink-0" />
              <p className="text-[12px] font-semibold text-gray-800">
                {section.title}
              </p>
            </div>
            {section.content.map((item, j) => (
              <p
                key={j}
                className="text-[12px] text-gray-500 whitespace-pre-line leading-[1.7] ml-2.5"
              >
                {item as string}
              </p>
            ))}
          </div>
        ))}
      </div>

      {/* 라디오 + 시작 버튼 */}
      <div className="px-5 pt-3 pb-5 border-t border-gray-100 flex-shrink-0 no-drag space-y-2">
        <label
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${consentChoice === "disagree" ? "border-gray-300 bg-gray-50" : "border-gray-100 hover:border-gray-200"}`}
        >
          <input
            type="radio"
            name="consent"
            value="disagree"
            checked={consentChoice === "disagree"}
            onChange={() => setConsentChoice("disagree")}
            className="accent-gray-400"
          />
          <span className="text-[12.5px] text-gray-500">
            {t("setup.consent.disagree")}
          </span>
        </label>
        <label
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${consentChoice === "agree" ? "border-primary/40 bg-primary/5" : "border-gray-100 hover:border-primary/20"}`}
        >
          <input
            type="radio"
            name="consent"
            value="agree"
            checked={consentChoice === "agree"}
            onChange={() => setConsentChoice("agree")}
            className="accent-primary"
          />
          <span className="text-[12.5px] text-gray-800 font-medium">
            {t("setup.consent.agree")}
          </span>
        </label>
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`w-full py-2.5 rounded-xl text-[13.5px] font-semibold transition-all mt-1 ${
            canStart
              ? "bg-primary text-white cursor-pointer shadow-sm hover:opacity-90"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {t("setup.consent.start")}
        </button>
      </div>
    </div>
  );
}
