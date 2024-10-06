import { ISession } from '../types'

// properties of session
export default function initial(): ISession {
  return {
    messageToDelete: 0,
    userReqId: 0,
    userResId: 0,
  }
}
