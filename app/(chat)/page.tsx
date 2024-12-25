import { cookies } from "next/headers";

import { Chat } from "@/components/chat";
import {
  DEFAULT_MODEL_NAME,
  models,
  DEFAULT_MODEL_ROSTER,
} from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { DataStreamHandler } from "@/components/data-stream-handler";

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdsFromCookie =
    cookieStore.get("model-id")?.value ?? DEFAULT_MODEL_ROSTER;

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedModelIds={modelIdsFromCookie}
        selectedVisibilityType="private"
        isReadonly={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
