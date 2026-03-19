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

  test("delimiter 없는 LaTeX 문단을 블록 수식으로 감싼다", () => {
    expect(
      normalizeMathMarkdown(
        String.raw`GAN의 미니맥스 목적식:

\min_G \max_D V(D,G) = \mathbb{E}_{x\sim p_\text{data}}[\log D(x)]

\mathbb{E}_{z\sim p_z}[\log(1-D(G(z)))]`,
      ),
    ).toBe(
      String.raw`GAN의 미니맥스 목적식:

$$
\min_G \max_D V(D,G) = \mathbb{E}_{x\sim p_\text{data}}[\log D(x)]
$$

$$
\mathbb{E}_{z\sim p_z}[\log(1-D(G(z)))]
$$`,
    );
  });

  test("일반 문장 사이의 standalone 수식 줄도 블록 수식으로 감싼다", () => {
    expect(
      normalizeMathMarkdown(
        String.raw`이를 각 데이터 포인트 x별로 보면, 최적화해야 할 함수는
f(D(x)) = p_{\text{data}}(x) \log D(x) + p_g(x) \log(1 - D(x)).

이를 D(x)에 대해 미분하고 0으로 두면:
\frac{\partial f}{\partial D(x)} = \frac{p_{\text{data}}(x)}{D(x)} - \frac{p_g(x)}{1 - D(x)} = 0.`,
      ),
    ).toBe(
      String.raw`이를 각 데이터 포인트 x별로 보면, 최적화해야 할 함수는
$$
f(D(x)) = p_{\text{data}}(x) \log D(x) + p_g(x) \log(1 - D(x)).
$$

이를 D(x)에 대해 미분하고 0으로 두면:
$$
\frac{\partial f}{\partial D(x)} = \frac{p_{\text{data}}(x)}{D(x)} - \frac{p_g(x)}{1 - D(x)} = 0.
$$`,
    );
  });

  test("문장 안의 bare inline LaTeX 토큰을 인라인 수식으로 감싼다", () => {
    expect(
      normalizeMathMarkdown(
        String.raw`여기서 p_{\text{data}}와 p_g는 서로 다른 분포이고 \Rightarrow 결론이 이어진다.`,
      ),
    ).toBe(
      String.raw`여기서 $p_{\text{data}}$와 $p_g$는 서로 다른 분포이고 $\Rightarrow$ 결론이 이어진다.`,
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

\text{logit}(D^\*(x))
= \log \frac{\tfrac{p_{\text{data}}(x)}{p_{\text{data}}(x) + p_g(x)}}
{\tfrac{p_g(x)}{p_{\text{data}}(x) + p_g(x)}}.

$$
`,
    );
  });

  test("reasoning_recap 같은 메타 텍스트는 수식으로 취급하지 않는다", () => {
    expect(normalizeMathMarkdown("reasoning_recap Thought for 5s")).toBe(
      "reasoning_recap Thought for 5s",
    );
  });
});
