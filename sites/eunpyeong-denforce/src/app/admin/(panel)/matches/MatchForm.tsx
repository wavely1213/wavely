"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { Row, SelectField, TextField } from "@/components/admin/fields";
import { LEAGUE } from "@/config/league";
import { isoToKst, type ActionState } from "@/lib/admin/form";
import type { MatchRow } from "@/lib/data/rows";
import { MATCH_SIDE_OPTIONS, MATCH_STATUS_OPTIONS } from "./labels";

export function MatchForm({
  action,
  initial,
  defaultVenue,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: MatchRow;
  /** 새 경기의 기본 장소 — 관리자 › 홈페이지 내용 › 기본 정보 '홈구장 이름' (D-046) */
  defaultVenue?: string;
}) {
  const kickoff = initial ? isoToKst(initial.kickoff) : null;

  return (
    <AdminForm action={action}>
      <Row>
        <TextField
          name="competition"
          label="대회"
          required
          maxLength={60}
          defaultValue={initial?.competition ?? LEAGUE.currentCompetition}
        />
        <TextField name="round" label="라운드" maxLength={30} placeholder="예: 3R" defaultValue={initial?.round} />
      </Row>
      <Row>
        <TextField name="kickoff_date" label="날짜" type="date" required defaultValue={kickoff?.date} />
        <TextField name="kickoff_time" label="시간" type="time" required hint="한국 시간" defaultValue={kickoff?.time} />
      </Row>
      <Row>
        <TextField name="venue" label="장소" maxLength={60} defaultValue={initial?.venue ?? defaultVenue} />
        <SelectField
          name="is_home"
          label="홈/원정"
          required
          options={MATCH_SIDE_OPTIONS}
          defaultValue={initial ? (initial.is_home ? "home" : "away") : undefined}
        />
      </Row>
      <Row>
        <TextField name="opponent" label="상대" required maxLength={40} defaultValue={initial?.opponent} />
        <SelectField
          name="status"
          label="상태"
          required
          options={MATCH_STATUS_OPTIONS}
          defaultValue={initial?.status}
        />
      </Row>
      <Row>
        <TextField
          name="score_us"
          label="우리 득점"
          type="number"
          hint="상태가 '종료'면 필수 (0~99)"
          defaultValue={initial?.score_us}
        />
        <TextField
          name="score_them"
          label="상대 득점"
          type="number"
          hint="'예정'이면 입력해도 저장되지 않습니다"
          defaultValue={initial?.score_them}
        />
      </Row>
    </AdminForm>
  );
}
