import { z } from 'zod'

/** 选项契约：facing=摄像头朝向（user 前置 / environment 后置）；mirror=预览是否镜像（on/off） */
export const optionsSchema = z.object({
  facing: z.enum(['user', 'environment']),
  mirror: z.enum(['on', 'off']),
})

export type CameraSnapshotOptions = z.infer<typeof optionsSchema>
