# Starkzap

Starkzap is a Starknet-based social challenge platform where users can create public dares, attach on-chain rewards, submit proof of completion, and let the community participate in deciding outcomes.

The project combines a modern web experience with blockchain-backed reward logic so that challenges, incentives, and finalization are transparent and verifiable.

## What the Project Does

Starkzap is designed to make internet challenges and social bounty flows more trustworthy and structured.

With Starkzap, users can:

- create public dares
- lock rewards tied to those dares
- browse and discover active challenges
- submit proof for completed challenges
- participate in community-driven review and voting
- finalize outcomes with transparent on-chain execution

The goal is to create a system where rewards are not managed by hidden off-chain logic, private spreadsheets, or centralized manual payout processes.

## Core Product Idea

The product sits at the intersection of:

- social coordination
- creator/community engagement
- on-chain incentive design
- transparent challenge resolution

A dare on Starkzap is more than a post. It is intended to be a public commitment with visible reward mechanics, a defined outcome flow, and a verifiable resolution process.

## Main Product Experience

The platform is centered around a few main user experiences:

### 1. Discovering dares
Users can explore a feed of challenges and view different states of activity across the platform.

### 2. Creating dares
A user can create a new challenge and define the reward structure attached to it.

### 3. Viewing dare details
Each dare can be opened individually to understand its objective, reward context, status, and proof flow.

### 4. Submitting proof
Participants can submit evidence that a dare has been completed.

### 5. Community review
The system supports a review/voting phase so outcomes are not determined by a single hidden actor.

### 6. Finalization
Once timing and state conditions are met, the dare can be finalized through the on-chain flow.

## Why Starkzap Exists

Many challenge and bounty systems break down because they depend too heavily on trust in a central operator. Starkzap aims to reduce that trust requirement by combining:

- public challenge visibility
- transparent reward handling
- shared community review
- blockchain-based execution

This makes the product especially relevant for crypto-native communities, creator ecosystems, social experiments, and public campaign mechanics.

## Current Project Structure

The repository is currently organized as a unified root workspace.

High-level sections include:

- `src/` — main application source
- `contracts/` — Starknet smart contracts
- `legacy/backend/` — archived backend from the older structure
- `.github/workflows/` — automation workflows
- `deploy.sh` — deployment helper script
- `vercel.json` — deployment configuration

## Technical Direction

Starkzap is currently built around:

- a root-level Next.js application
- Starknet smart contract integration
- Cairo contracts for on-chain logic
- Vercel deployment
- GitHub Actions for scheduled automation

The project has recently been migrated from an older nested structure into a cleaner root-level setup for easier maintenance and deployment.

## Automation and Operations

The platform includes an automated finalization flow for eligible dares.

This automation now works through GitHub Actions calling the deployed application endpoint on a schedule. This replaced the earlier Vercel cron approach because of Hobby plan scheduling limits.

### GitHub Actions Secrets

To enable the automated finalization cron job, set the following secrets in the GitHub repository settings:

| Secret | Description | Example Value |
|---|---|---|
| `FINALIZE_URL` | Full URL of the finalize API endpoint | `https://dareboard.vercel.app/api/finalize` |
| `CRON_SECRET` | Secret token used to authorize the cron request | any strong random string |

The `FINALIZE_URL` for the production deployment is:

```
https://dareboard.vercel.app/api/finalize
```

This endpoint accepts `POST` requests and requires the `Authorization: Bearer <CRON_SECRET>` header.

## Deployment

The project is deployed on Vercel.

Production domain:

- `https://dareboard.vercel.app`

## Repository Notes

This repository includes both active project materials and some supporting reference documents. Some non-primary documentation and archived materials may be stored separately to keep the root of the project cleaner.

## Vision

Starkzap aims to make on-chain social challenges feel:

- transparent
- community-driven
- incentive-aligned
- easy to participate in
- operationally reliable

Over time, the platform can evolve into a broader primitive for public challenges, bounty campaigns, creator engagement loops, and community coordination on Starknet.

## Summary

Starkzap is a product-focused Starknet application that turns social dares into transparent, reward-backed, community-reviewed on-chain experiences.

It is not just a frontend for contract interaction; it is a structured challenge system designed to make social participation, proof, and payouts more trustworthy.