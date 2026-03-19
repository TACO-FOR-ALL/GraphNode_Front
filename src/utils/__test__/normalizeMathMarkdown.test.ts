import normalizeMathMarkdown from "../normalizeMathMarkdown";

describe("normalizeMathMarkdown", () => {
  test("이스케이프된 인라인 달러 수식을 복원한다", () => {
    expect(normalizeMathMarkdown(String.raw`기본 게임과 최적 판별자 \$D^*\$`)).toBe(
      "기본 게임과 최적 판별자 $D^*$",
    );
  });

  test("이중 이스케이프된 블록 수식 delimiter를 복원한다", () => {
    expect(
      normalizeMathMarkdown(
        String.raw`\\[D^*(x)=\\frac{p_{data}(x)}{p_{data}(x)+p_g(x)}\\]`,
      ),
    ).toBe("\n$$\nD^*(x)=\\frac{p_{data}(x)}{p_{data}(x)+p_g(x)}\n$$\n");
  });

  test("이중 이스케이프된 괄호 수식을 복원한다", () => {
    expect(normalizeMathMarkdown(String.raw`여기서 \\(p_g\\) 는 생성 분포다.`)).toBe(
      "여기서 $p_g$ 는 생성 분포다.",
    );
  });

  test("닫히지 않은 달러 이스케이프는 그대로 둔다", () => {
    expect(normalizeMathMarkdown(String.raw`가격은 \$100 입니다.`)).toBe(
      String.raw`가격은 \$100 입니다.`,
    );
  });

  test("한쪽만 이스케이프된 인라인 달러 수식도 복원한다", () => {
    expect(
      normalizeMathMarkdown(
        String.raw`여기서 \$p_g$는 $G\$가 유도하는 분포(즉 \$x=G(z)$)입니다.`,
      ),
    ).toBe(
      String.raw`여기서 $p_g$는 $G$가 유도하는 분포(즉 $x=G(z)$)입니다.`,
    );
  });

  test("기존 display math 블록 내부는 다시 쪼개지지 않는다", () => {
    expect(
      normalizeMathMarkdown(
        String.raw`\[
\text{logit}(D^\*(x))
= \log \frac{\tfrac{p_{\text{data}}(x)}{p_{\text{data}}(x) + p_g(x)}}
{\tfrac{p_g(x)}{p_{\text{data}}(x) + p_g(x)}}.
\]`,
      ),
    ).toBe(
      String.raw`
$$
\text{logit}(D^\*(x)) = \log \frac{\tfrac{p_{\text{data}}(x)}{p_{\text{data}}(x) + p_g(x)}} {\tfrac{p_g(x)}{p_{\text{data}}(x) + p_g(x)}}.
$$
`,
    );
  });

  test("reasoning_recap 같은 메타 텍스트는 수식으로 취급하지 않는다", () => {
    expect(normalizeMathMarkdown("reasoning_recap Thought for 5s")).toBe(
      "reasoning_recap Thought for 5s",
    );
  });

  test("delimiter 없이 시작하는 LaTeX display 수식 한 줄은 블록 수식으로 감싼다", () => {
    expect(
      normalizeMathMarkdown(
        String.raw`\min_G \max_D; V(D,G)=\mathbb{E}_{x\sim p_{\text{data}}}[\log D(x)] + \mathbb{E}_{z\sim p_z}[\log(1-D(G(z)))]`,
      ),
    ).toBe(
      String.raw`$$
\min_G \max_D; V(D,G)=\mathbb{E}_{x\sim p_{\text{data}}}[\log D(x)] + \mathbb{E}_{z\sim p_z}[\log(1-D(G(z)))]
$$`,
    );
  });
});
