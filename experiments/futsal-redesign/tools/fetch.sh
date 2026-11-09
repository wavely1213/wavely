#!/usr/bin/env bash
# 원본(futsal.or.kr) 첫 화면과 첫 화면이 비동기로 불러오는 데이터를 raw/ 에 저장한다.
# 사용: bash tools/fetch.sh && python3 -I tools/parse.py && python3 -I tools/build.py
set -euo pipefail
cd "$(dirname "$0")/.."
B=http://www.futsal.or.kr
mkdir -p raw
get()  { curl -sSL -m 30 -A "Mozilla/5.0" "$B/$1" -o "raw/$2"; }
post() { curl -sSL -m 30 -A "Mozilla/5.0" -X POST -d "$2" "$B/$1" -o "raw/$3"; }

get start.action start.html
# FK CUP 부문: 113=남자부(type 10), 114=여자1부, 115=여자2부(type 11)
for s in 113:10:Man 114:11:Woman 115:11:Woman; do
  IFS=: read -r seq ty kind <<<"$s"
  post "main_selectMain${kind}League.action" "league_seq=$seq" "t_$seq.json"
  for w in Plan Goal Foul Red Rank; do
    post "main_selectMainLeague$w.action" "league_seq=$seq&league_type=$ty" "${w}_$seq.html"
  done
done
post main_selectMainAllLeagueResultList.action "league_type=11" players_w.html
for i in 1 2 3; do post main_selectMainNews.action "limit_num=$i" "news_$i.json"; done
echo "saved to raw/"
