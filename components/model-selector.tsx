"use client";

import { ChatIcon, TextIcon, ModelCodeIcon } from "./icons";
import { startTransition, useState, useEffect } from "react";

import { saveModelId } from "@/app/(chat)/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { models } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";
import { json } from "stream/consumers";

interface SelectedModels {
  chat: string;
  text: string;
  code: string;
}

export function ModelSelector({
  selectedModelIds,
  className,
}: {
  selectedModelIds: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);

  const selectedModelId: SelectedModels = (() => {
    try {
      return JSON.parse(selectedModelIds);
    } catch {
      console.log("error loading models from cookies", selectedModelIds);
      return { chat: models[0].id, text: models[0].id, code: models[0].id };
    }
  })();

  const [selectedModels, setSelectedModels] = useState<SelectedModels>({
    chat: selectedModelId.chat,
    text: selectedModelId.text,
    code: selectedModelId.code,
  });

  const handleModelSelect = (
    modelId: string,
    capability: keyof SelectedModels
  ) => {
    console.log(modelId, capability);
    startTransition(() => {
      setSelectedModels((prev) => ({ ...prev, [capability]: modelId }));
    });
  };

  useEffect(() => {
    if (selectedModelIds === JSON.stringify(selectedModels)) return;
    saveModelId(JSON.stringify(selectedModels));
  }, [selectedModels]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className
        )}
      >
        <Button variant="outline" className="md:px-2 md:h-[34px]">
          Model Selector
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        <div className="p-4 border rounded-lg">
          <div className="grid grid-cols-4 gap-4 mb-4 items-center font-medium">
            <div>Model</div>
            <div className="flex justify-center">
              <ChatIcon className="w-5 h-5" />
            </div>
            <div className="flex justify-center">
              <TextIcon className="w-5 h-5" />
            </div>
            <div className="flex justify-center">
              <ModelCodeIcon className="w-5 h-5" />
            </div>
          </div>

          {models.map((model) => (
            <div
              key={model.id}
              className="grid grid-cols-4 gap-4 py-2 items-center border-t"
            >
              <div className="flex flex-col">
                <span>{model.label}</span>
                {model.description && (
                  <span className="text-xs text-muted-foreground">
                    {model.description}
                  </span>
                )}
              </div>
              <div className="flex justify-center">
                {model.capabilities.chat && (
                  <input
                    type="checkbox"
                    name="chat-model"
                    checked={selectedModels.chat === model.id}
                    onChange={() => handleModelSelect(model.id, "chat")}
                    className="w-4 h-4"
                  />
                )}
              </div>
              <div className="flex justify-center">
                {model.capabilities.text && (
                  <input
                    type="checkbox"
                    name="text-model"
                    checked={selectedModels.text === model.id}
                    onChange={() => handleModelSelect(model.id, "text")}
                    className="w-4 h-4"
                  />
                )}
              </div>
              <div className="flex justify-center">
                {model.capabilities.code && (
                  <input
                    type="checkbox"
                    name="code-model"
                    checked={selectedModels.code === model.id}
                    onChange={() => handleModelSelect(model.id, "code")}
                    className="w-4 h-4"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
