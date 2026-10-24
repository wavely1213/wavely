/* 원본 사이트(futsal.or.kr)에서 그대로 가져온 고정 콘텐츠. 문구를 새로 만들지 않는다. */
window.KFL = window.KFL || {};

KFL.ORIGIN = 'http://www.futsal.or.kr/';

KFL.SITE = {
  name: '한국풋살연맹',
  slogan: '하나의 단체, 더 큰 풋살',
};

KFL.MENU = [
  { label: '풋살연맹소개', items: [
    { label: '인사말', href: 'intr_speechLoad.action' },
    { label: '비젼&목표', href: 'intr_introduceLoad.action' },
    { label: '조직도', href: 'intr_groupLoad.action' },
    { label: '산하단체현황', href: 'UniteList.action' },
    { label: '연맹정관', href: 'intr_historyLoad.action' },
    { label: '지정기부금', href: 'DonationList.action' },
    { label: '찾아오시는길', href: 'intr_locationLoad.action' },
  ] },
  { label: '풋살소개', items: [
    { label: '풋살이란', href: 'fal_infoLoad.action' },
    { label: '풋살의역사', href: 'fal_historyLoad.action' },
    { label: '경기규칙', href: 'brd_boardLoad.action?board_id=10' },
    { label: '전국풋살구장', href: 'fal_stadiumLoad.action' },
  ] },
  { label: 'FK리그', items: [
    { label: 'FK리그구단소개', href: 'mng_FKLeagueTeam.action' },
    { label: '역대전적', href: 'brd_boardLoad.action?board_id=14' },
    { label: 'FK리그일정', href: 'mng_GameList.action' },
    { label: 'FK리그회원규정', href: 'mng_FKRule.action' },
  ] },
  { label: '대회', items: [
    { label: '대회소식', href: 'brd_boardLoad.action?board_id=03' },
    { label: '대회 사진', href: 'brd_boardLoad.action?board_id=09' },
    { label: '생활체육', href: 'LeagueList.action' },
    { label: 'FK CUP & 유·청소년', href: 'mng_GameCupList.action' },
  ] },
  { label: '커뮤니티', items: [
    { label: '공지사항', href: 'brd_boardLoad.action?board_id=00' },
    { label: 'NEWS', href: 'mng_newsList.action' },
    { label: '포토', href: 'photo.action' },
    { label: '동영상', href: 'VideoList.action' },
    { label: 'FK 리그 중계', href: 'popup_onstn_league.action', external: true },
    { label: 'FK CUP 중계', href: 'popup_onstn_cup.action', external: true },
  ] },
  { label: '클럽현황', items: [
    { label: '전체클럽현황', href: 'NewClubList.action' },
    { label: '클럽등록', href: 'clubjoin.action' },
    { label: '풋살장현황', href: 'mng_stadiumList.action' },
  ] },
  { label: '심판현황', items: [
    { label: '심판목록', href: 'RefereeList.action' },
    { label: '심판공지사항', href: 'brd_boardLoad.action?board_id=05' },
    { label: '대회신청', href: 'refereeLeagueList.action' },
  ] },
  { label: '등록 및 참가신청', href: 'https://www.joinkfa.com/', external: true },
  { label: '후원사', href: 'intr_sponLoad.action' },
];

/* 원본 메뉴 항목 중 자주 찾는 것을 첫 화면에 꺼내 둔 바로가기. 링크·이름은 원본 메뉴와 동일. */
KFL.QUICK = ['FK리그일정', '대회소식', '공지사항', '클럽등록', '전국풋살구장', '등록 및 참가신청'];

KFL.SPONSORS = [
  { name: 'flex', img: 'new_spon_flex.gif', href: 'https://flex.team/' },
  { name: '문화체육관광부', img: 'new_spon02.gif', href: 'http://www.mcst.go.kr' },
  { name: '대한체육회', img: 'new_spon03.gif', href: 'https://www.sports.or.kr' },
  { name: '국민체육진흥공단', img: 'new_spon04.gif', href: 'http://www.kspo.or.kr' },
  { name: 'KFA', img: 'new_spon05.gif', href: 'http://www.kfa.or.kr' },
  { name: '링티', img: 'new_spon_lingtea.gif', href: 'https://lingerwatershop.com/' },
  { name: '(주)스카이컴', img: 'new_spon08.gif', href: 'https://www.skycom.ne.kr' },
  { name: 'star', img: 'new_spon_star2.gif', href: 'https://starsportsmall.co.kr/main/' },
  { name: 'XENOR', img: 'new_spon_xenor.gif', href: 'https://smartstore.naver.com/xenor/' },
];

KFL.FOOTER = {
  address: '(우)05540 서울 송파구 올림픽로 424 벨로드롬 A동 120호',
  tel: '02-720-2443~4',
  telHref: '02-720-2443',
  fax: '02-720-2441',
  email: 'futsal1004@naver.com',
  copyright: 'Copyright 한국풋살연맹 All rights reserved.',
  social: [
    { label: '유튜브', href: 'https://www.youtube.com/channel/UCf8oQ3Clz_d5bpeMEv3AZrg' },
    { label: '인스타그램', href: 'https://www.instagram.com/korea_futsal_league' },
    { label: '페이스북', href: 'https://www.facebook.com/KoreaFutsalLeague' },
  ],
};
