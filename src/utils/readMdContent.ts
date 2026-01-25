// https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve

export const readMdContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // 파일 읽기가 끝나면
    reader.onload = (event) => {
      // resolve: 작업 성공
      resolve(event.target?.result as string);
    };

    // 파일 읽기 실패
    // reject: 작업 실패 (try-catch블록 에러 발송)
    reader.onerror = (error) => reject(error);

    // 수행할 작업
    reader.readAsText(file);
  });
};
