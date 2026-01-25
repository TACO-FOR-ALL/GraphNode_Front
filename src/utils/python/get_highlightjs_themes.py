import requests
from bs4 import BeautifulSoup

def get_highlightjs_themes():
    url = "https://highlightjs.org/examples"
    
    # 웹페이지 내용 가져오기
    try:
        response = requests.get(url)
        response.raise_for_status() # 에러 확인
    except requests.exceptions.RequestException as e:
        print(f"Error fetching URL: {e}")
        return []

    # HTML 파싱
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # id가 'theme-selector'인 select 태그 찾기
    select_element = soup.find('select', id='theme-selector')
    
    options_list = []
    
    if select_element:
        # select 태그 안의 모든 option 태그 찾기
        options = select_element.find_all('option')
        for option in options:
            # 텍스트 공백 제거 후 리스트에 추가
            options_list.append(option.text.strip())
    else:
        print("Selector not found. The content might be loaded dynamically (Try Selenium).")
        
    return options_list

# 실행 및 출력
themes = get_highlightjs_themes()
print(f"총 {len(themes)}개의 테마를 찾았습니다.")
print(themes)