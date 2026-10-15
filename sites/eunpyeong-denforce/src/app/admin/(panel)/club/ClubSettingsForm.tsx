"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { Row, TextArea, TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";
import type { ClubSettingsRow } from "@/lib/data/rows";

/** 구단정보 폼 — 행이 아직 없으면 initial 없이 빈 폼으로 보여주고, 저장하면 행이 만들어진다 */
export function ClubSettingsForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: ClubSettingsRow | null;
}) {
  return (
    <AdminForm action={action}>
      <TextArea
        name="intro"
        label="구단 소개"
        required
        hint="구단소개 페이지 첫머리에 보입니다. 빈 줄(엔터 두 번)로 문단을 나눕니다."
        defaultValue={initial?.intro}
      />
      <Row>
        <TextField
          name="contact_email"
          label="문의 이메일"
          type="email"
          maxLength={254}
          placeholder="name@example.com"
          hint="문의 페이지·푸터에 보입니다"
          defaultValue={initial?.contact_email}
        />
        <TextField
          name="contact_phone"
          label="문의 전화"
          type="tel"
          maxLength={30}
          hint="문의 페이지·푸터에 보입니다"
          defaultValue={initial?.contact_phone}
        />
      </Row>
      <TextField
        name="contact_address"
        label="사무국 주소"
        maxLength={120}
        hint="문의 페이지·푸터에 보입니다 (비우면 표시하지 않음)"
        defaultValue={initial?.contact_address}
      />
      <Row>
        <TextField
          name="instagram_url"
          label="인스타그램 주소"
          type="url"
          placeholder="https://"
          defaultValue={initial?.instagram_url}
        />
        <TextField
          name="youtube_url"
          label="유튜브 주소"
          type="url"
          placeholder="https://"
          defaultValue={initial?.youtube_url}
        />
      </Row>
      <TextField
        name="venue_address"
        label="홈구장 주소"
        maxLength={120}
        hint="오시는 길 페이지에 보입니다"
        defaultValue={initial?.venue_address}
      />
      <TextArea
        name="venue_transit"
        label="대중교통 안내"
        rows={3}
        hint="오시는 길 페이지에 보입니다 · 300자 이하"
        defaultValue={initial?.venue_transit}
      />
      <TextArea
        name="venue_parking"
        label="주차 안내"
        rows={3}
        hint="오시는 길 페이지에 보입니다 · 300자 이하"
        defaultValue={initial?.venue_parking}
      />
    </AdminForm>
  );
}
