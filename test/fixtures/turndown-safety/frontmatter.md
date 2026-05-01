---
title: Frontmatter Round-Trip Fixture
author: letitia
date: 2026-05-02
tags: [turndown, fixture, edit-mode]
categories:
  - testing
  - fixtures
status: draft
description: 验证 YAML front matter 在编辑模式 open-save 循环中保持字节一致
---

# 正文开始

这个 fixture 验证 YAML front matter 在经过编辑模式打开-保存循环后，分隔符 `---` 与内部 YAML 结构（包括字符串、数组、嵌套列表）都不被破坏。

## 测试点 1 — 简单字段

上面的 `title`、`author`、`date` 都是简单字符串/日期。保存后它们的格式应完全一致。

## 测试点 2 — 数组字段

`tags: [a, b, c]` 使用内联数组语法，保存后应保持内联形式，不应被拆成块式。

## 测试点 3 — 嵌套列表

`categories` 使用块式嵌套列表，缩进和破折号应完整保留。

## 测试点 4 — 不保存 %%FRONTMATTER%% 内部标记

保存后的磁盘文件绝对不应包含 `%%FRONTMATTER%%` 字符串（内部标记前缀）。
