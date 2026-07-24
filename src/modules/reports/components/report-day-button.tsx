"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getToday } from "@/modules/finance/data";
import { formatLongDate } from "@/modules/finance/utils";

export function ReportDayButton({
  onGenerate,
  label = "Relatório do dia",
  description = "Gere o PDF com os registros desta seção no dia escolhido.",
}: {
  onGenerate: (dateISO: string) => void;
  label?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(getToday());

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => {
          setDate(getToday());
          setOpen(true);
        }}
      >
        <FileDown className="size-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Relatório do dia</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="report-day-date" className="text-xs text-slate-500">
              Data
            </Label>
            <Input
              id="report-day-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs capitalize text-slate-500">
              {formatLongDate(date)}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                onGenerate(date);
                setOpen(false);
              }}
            >
              <FileDown className="size-4" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
