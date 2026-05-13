"use client"

import * as React from "react"
import type { FieldValues, Path, Resolver, UseFormReturn } from "react-hook-form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ZodTypeAny } from "zod"

interface FormProps<T extends FieldValues = FieldValues> {
  schema?: ZodTypeAny
  defaultValues?: T
  onSubmit: (data: T) => void
  children: (methods: UseFormReturn<T>) => React.ReactNode
  className?: string
}

export function Form<T extends FieldValues = FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: (schema ? (zodResolver as unknown as (s: unknown) => Resolver<T>)(schema) : undefined),
    defaultValues,
  } as never)

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
      {children(methods)}
    </form>
  )
}

interface FormFieldProps<T extends FieldValues = FieldValues> {
  methods: UseFormReturn<T>
  name: Path<T>
  children: (field: {
    value: T[keyof T]
    onChange: (value: T[keyof T]) => void
    onBlur: (...args: unknown[]) => void
    ref: (el: HTMLInputElement | null) => void
  }) => React.ReactNode
}

export function FormField<T extends FieldValues = FieldValues>({
  methods,
  name,
  children,
}: FormFieldProps<T>) {
  const field = methods.register(name)

  return children({
    value: methods.watch(name) as T[keyof T],
    onChange: (value) => methods.setValue(name, value as never),
    onBlur: field.onBlur as unknown as (...args: unknown[]) => void,
    ref: (el) => field.ref(el),
  })
}
