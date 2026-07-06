"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Deal, PipelineStage } from "@/types";
import { DealCard } from "./deal-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface PipelineBoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  onDealMoved: (dealId: string, newStageId: string) => void;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
  onOpenChat?: (phone: string) => void;
}

export function PipelineBoard({
  stages,
  deals,
  onDealMoved,
  onAddDeal,
  onEditDeal,
  onOpenChat,
}: PipelineBoardProps) {
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -320 : 320;
    el.scrollBy({ left: amount, behavior: "smooth" });
    // Update buttons after scroll animation
    setTimeout(updateScrollButtons, 350);
  }, [updateScrollButtons]);

  // Initialize scroll buttons on mount and when stages change
  useEffect(() => {
    // Small delay to let the DOM render
    const timer = setTimeout(updateScrollButtons, 100);
    return () => clearTimeout(timer);
  }, [stages, updateScrollButtons]);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of sortedStages) map.set(stage.id, []);
    for (const deal of deals) {
      const bucket = map.get(deal.stage_id);
      if (bucket) bucket.push(deal);
    }
    return map;
  }, [sortedStages, deals]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const activeDeal = activeDealId
    ? deals.find((d) => d.id === activeDealId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDealId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = String(active.id);
    const targetStageId = String(over.id);

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === targetStageId) return;
    if (!sortedStages.some((s) => s.id === targetStageId)) return;

    onDealMoved(dealId, targetStageId);
  }

  function handleDragCancel() {
    setActiveDealId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-muted transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scrollbar-hide lg:snap-none"
        >
          {sortedStages.map((stage) => {
            const stageDeals = dealsByStage.get(stage.id) ?? [];
            const totalValue = stageDeals.reduce(
              (s, d) => s + Number(d.value || 0),
              0,
            );
            return (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={stageDeals}
                totalValue={totalValue}
                onAddDeal={onAddDeal}
                onEditDeal={onEditDeal}
                onOpenChat={onOpenChat}
              />
            );
          })}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-muted transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {activeDeal ? (
          <div className="opacity-90">
            <DealCard
              deal={activeDeal}
              stage={
                sortedStages.find((s) => s.id === activeDeal.stage_id) ?? null
              }
              onEdit={() => {}}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function StageColumn({
  stage,
  deals,
  totalValue,
  onAddDeal,
  onEditDeal,
  onOpenChat,
}: {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: Deal) => void;
  onOpenChat?: (phone: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="flex w-[85vw] min-w-[260px] max-w-[320px] shrink-0 snap-start flex-col rounded-xl border border-border bg-card/60 p-4 lg:w-auto lg:max-w-none lg:flex-1 lg:basis-[260px] lg:shrink lg:snap-none">
      <div
        className="-mx-4 -mt-4 h-[3px] rounded-t-xl"
        style={{ backgroundColor: stage.color }}
      />
      <div className="flex items-center justify-between pt-3">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {stage.name}
        </h3>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {deals.length}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {formatCurrency(totalValue)}
      </p>

      <div
        ref={setNodeRef}
        className={`mt-3 flex flex-1 flex-col gap-2 rounded-lg transition-all ${
          isOver
            ? "bg-primary/5 outline outline-2 outline-dashed outline-primary outline-offset-2"
            : ""
        }`}
      >
        {deals.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-border py-10 text-xs text-muted-foreground">
            Arraste um negócio aqui
          </div>
        ) : (
          deals.map((deal) => (
            <DraggableDealCard
              key={deal.id}
              deal={deal}
              stage={stage}
              onEdit={onEditDeal}
              onOpenChat={onOpenChat}
            />
          ))
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onAddDeal(stage.id)}
        className="mt-3 w-full justify-start border border-dashed border-border bg-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
      >
        <Plus className="mr-1 h-3 w-3" />
        Adicionar Negócio
      </Button>
    </div>
  );
}

function DraggableDealCard({
  deal,
  stage,
  onEdit,
  onOpenChat,
}: {
  deal: Deal;
  stage: PipelineStage;
  onEdit: (deal: Deal) => void;
  onOpenChat?: (phone: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1, touchAction: "none" }}
    >
      <DealCard deal={deal} stage={stage} onEdit={onEdit} onOpenChat={onOpenChat} />
    </div>
  );
}

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}
