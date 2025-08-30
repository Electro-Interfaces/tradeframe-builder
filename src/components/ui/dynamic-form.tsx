import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface DynamicFormProps {
  jsonSchema: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitText?: string;
}

// Функция для конвертации JSON Schema в Zod Schema
const jsonSchemaToZodSchema = (jsonSchema: any) => {
  const properties = jsonSchema.properties || {};
  const required = jsonSchema.required || [];
  
  const zodFields: any = {};
  
  Object.entries(properties).forEach(([key, prop]: [string, any]) => {
    let zodField;
    
    switch (prop.type) {
      case "string":
        zodField = z.string();
        if (prop.minLength) zodField = zodField.min(prop.minLength);
        if (prop.maxLength) zodField = zodField.max(prop.maxLength);
        if (prop.pattern) zodField = zodField.regex(new RegExp(prop.pattern));
        break;
      case "number":
      case "integer":
        zodField = z.number();
        if (prop.minimum !== undefined) zodField = zodField.min(prop.minimum);
        if (prop.maximum !== undefined) zodField = zodField.max(prop.maximum);
        break;
      case "boolean":
        zodField = z.boolean();
        break;
      case "array":
        zodField = z.array(z.string());
        break;
      default:
        zodField = z.string();
    }
    
    if (!required.includes(key)) {
      zodField = zodField.optional();
    } else {
      if (prop.type === "string") {
        zodField = zodField.min(1, `${prop.title || key} обязательно`);
      }
    }
    
    zodFields[key] = zodField;
  });
  
  return z.object(zodFields);
};

// Функция для рендеринга поля на основе JSON Schema
const renderField = (key: string, schema: any, control: any, errors: any) => {
  const { type, title, description, enum: enumValues, minimum, maximum } = schema;
  const label = title || key;
  const hasError = !!errors[key];
  
  switch (type) {
    case "string":
      if (enumValues && enumValues.length > 0) {
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Controller
              name={key}
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Выберите ${label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {enumValues.map((value: string) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {hasError && <p className="text-sm text-destructive">{errors[key]?.message}</p>}
          </div>
        );
      }
      
      if (description && description.includes("multiline")) {
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Controller
              name={key}
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder={description || `Введите ${label.toLowerCase()}`}
                  rows={3}
                />
              )}
            />
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            {hasError && <p className="text-sm text-destructive">{errors[key]?.message}</p>}
          </div>
        );
      }
      
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <Controller
            name={key}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder={description || `Введите ${label.toLowerCase()}`}
              />
            )}
          />
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {hasError && <p className="text-sm text-destructive">{errors[key]?.message}</p>}
        </div>
      );
      
    case "number":
    case "integer":
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <Controller
            name={key}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={minimum}
                max={maximum}
                onChange={(e) => {
                  const value = type === "integer" ? parseInt(e.target.value) : parseFloat(e.target.value);
                  field.onChange(isNaN(value) ? "" : value);
                }}
                placeholder={description || `Введите ${label.toLowerCase()}`}
              />
            )}
          />
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {hasError && <p className="text-sm text-destructive">{errors[key]?.message}</p>}
        </div>
      );
      
    case "boolean":
      return (
        <div key={key} className="space-y-2">
          <div className="flex items-center space-x-2">
            <Controller
              name={key}
              control={control}
              render={({ field }) => (
                <Checkbox
                  id={key}
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor={key}>{label}</Label>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {hasError && <p className="text-sm text-destructive">{errors[key]?.message}</p>}
        </div>
      );
      
    default:
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          <Controller
            name={key}
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder={description || `Введите ${label.toLowerCase()}`}
              />
            )}
          />
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {hasError && <p className="text-sm text-destructive">{errors[key]?.message}</p>}
        </div>
      );
  }
};

export function DynamicForm({ jsonSchema, onSubmit, onCancel, isLoading = false, submitText = "Выполнить" }: DynamicFormProps) {
  let parsedSchema;
  
  try {
    parsedSchema = typeof jsonSchema === "string" ? JSON.parse(jsonSchema) : jsonSchema;
  } catch (error) {
    return (
      <div className="p-4 border border-destructive rounded-lg">
        <p className="text-destructive text-sm">Ошибка парсинга JSON Schema: {error instanceof Error ? error.message : "Неизвестная ошибка"}</p>
      </div>
    );
  }
  
  const zodSchema = jsonSchemaToZodSchema(parsedSchema);
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: {},
  });
  
  const properties = parsedSchema.properties || {};
  
  if (Object.keys(properties).length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Эта команда не требует дополнительных параметров.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button onClick={() => onSubmit({})} disabled={isLoading}>
            {submitText}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-4">
        {Object.entries(properties).map(([key, schema]) =>
          renderField(key, schema, control, errors)
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={isLoading}>
          {submitText}
        </Button>
      </div>
    </form>
  );
}